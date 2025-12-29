const std = @import("std");
const config = @import("core/config.zig");
const args = @import("cli/args.zig");
const commands = @import("cli/commands.zig");

pub fn main() !void {
    // Set up allocator
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Get command line arguments
    const argv = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, argv);

    // Parse command
    const cmd = args.parse(allocator, argv) catch |err| {
        const stderr = std.io.getStdErr().writer();
        try stderr.print("Error: {s}\n\n", .{@errorName(err)});
        try args.printHelp(stderr);
        return;
    };

    // Handle help and version first (no config needed)
    switch (cmd) {
        .help => {
            const stdout = std.io.getStdOut().writer();
            try args.printHelp(stdout);
            return;
        },
        .version => {
            const stdout = std.io.getStdOut().writer();
            try args.printVersion(stdout);
            return;
        },
        .config => |subcmd| {
            if (subcmd == .init) {
                try commands.handleConfigInit(allocator);
                return;
            }
            // For config show, we need to load config
        },
        else => {},
    }

    // Load configuration
    var cfg = config.Config.load(allocator) catch |err| {
        const stderr = std.io.getStdErr().writer();
        try stderr.print("Error loading config: {s}\n", .{@errorName(err)});
        try stderr.print("\nPlease set environment variables or run:\n", .{});
        try stderr.print("  jira-report config init\n", .{});
        return;
    };
    defer cfg.deinit();

    // Route to command handlers
    switch (cmd) {
        .generate => |opts| {
            try commands.handleGenerate(cfg, opts);
        },
        .logtime => |opts| {
            try commands.handleLogtime(cfg, opts);
        },
        .open => |opts| {
            try commands.handleOpen(cfg, opts);
        },
        .tui => {
            try commands.handleTui(cfg);
        },
        .config => |subcmd| {
            if (subcmd == .show) {
                try commands.handleConfigShow(cfg);
            }
        },
        .help, .version => unreachable, // Already handled above
    }
}

// Import test files
test {
    _ = @import("core/types.zig");
    _ = @import("core/config.zig");
    _ = @import("cli/args.zig");
    _ = @import("utils/datetime.zig");
    _ = @import("utils/json.zig");
}
