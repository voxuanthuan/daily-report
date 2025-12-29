const std = @import("std");
const config = @import("../core/config.zig");
const args = @import("args.zig");

/// Handle generate command
pub fn handleGenerate(cfg: config.Config, opts: args.GenerateOpts) !void {
    const stdout = std.io.getStdOut().writer();

    try stdout.print("Generate command (stub)\n", .{});
    try stdout.print("Format: {s}\n", .{opts.output_format});
    try stdout.print("Server: {s}\n", .{cfg.jira_server});

    // TODO: Implement in Phase 2 - Jira Integration
    try stdout.print("\n[Phase 2] Will fetch tasks and generate report\n", .{});
}

/// Handle logtime command
pub fn handleLogtime(cfg: config.Config, opts: args.LogtimeOpts) !void {
    const stdout = std.io.getStdOut().writer();

    try stdout.print("Logtime command (stub)\n", .{});
    try stdout.print("Entries: {s}\n", .{opts.entries});
    if (opts.date) |date| {
        try stdout.print("Date: {s}\n", .{date});
    }
    if (opts.description) |desc| {
        try stdout.print("Description: {s}\n", .{desc});
    }
    try stdout.print("Server: {s}\n", .{cfg.jira_server});

    // TODO: Implement in Phase 3 - Tempo Integration
    try stdout.print("\n[Phase 3] Will parse entries and log time to Tempo\n", .{});
}

/// Handle open command
pub fn handleOpen(cfg: config.Config, opts: args.OpenOpts) !void {
    const stdout = std.io.getStdOut().writer();

    try stdout.print("Open command (stub)\n", .{});
    try stdout.print("Ticket: {s}\n", .{opts.ticket_id});
    try stdout.print("URL: {s}browse/{s}\n", .{ cfg.jira_server, opts.ticket_id });

    // TODO: Implement in Phase 2 - open browser
    try stdout.print("\n[Phase 2] Will open URL in default browser\n", .{});
}

/// Handle TUI command
pub fn handleTui(cfg: config.Config) !void {
    const stdout = std.io.getStdOut().writer();

    try stdout.print("TUI command (stub)\n", .{});
    try stdout.print("Server: {s}\n", .{cfg.jira_server});

    // TODO: Implement in Phase 4 - TUI
    try stdout.print("\n[Phase 4] Will launch terminal UI\n", .{});
}

/// Handle config show subcommand
pub fn handleConfigShow(cfg: config.Config) !void {
    const stdout = std.io.getStdOut().writer();
    try cfg.show(stdout);
}

/// Handle config init subcommand
pub fn handleConfigInit(allocator: std.mem.Allocator) !void {
    const stdout = std.io.getStdOut().writer();

    try config.Config.init(allocator);
    try stdout.print("Config file created at ~/.jira-report.json\n", .{});
    try stdout.print("Please edit the file with your credentials.\n", .{});
}
