const std = @import("std");
const types = @import("../core/types.zig");

/// Generate command options
pub const GenerateOpts = struct {
    output_format: []const u8 = "text", // text or json
};

/// Logtime command options
pub const LogtimeOpts = struct {
    entries: []const u8, // "TICKET-123 2h, TICKET-456 1.5h"
    date: ?[]const u8 = null, // "today", "yesterday", or "YYYY-MM-DD"
    description: ?[]const u8 = null,
};

/// Open command options
pub const OpenOpts = struct {
    ticket_id: []const u8,
};

/// Config subcommands
pub const ConfigSubcommand = enum {
    show,
    init,
};

/// Main command union
pub const Command = union(enum) {
    generate: GenerateOpts,
    logtime: LogtimeOpts,
    open: OpenOpts,
    tui: void,
    config: ConfigSubcommand,
    help: void,
    version: void,
};

/// Parse command line arguments
pub fn parse(allocator: std.mem.Allocator, args: []const []const u8) !Command {
    if (args.len < 2) {
        return Command{ .help = {} };
    }

    const cmd = args[1];

    // Handle --help flag
    if (std.mem.eql(u8, cmd, "--help") or std.mem.eql(u8, cmd, "-h")) {
        return Command{ .help = {} };
    }

    // Handle --version flag
    if (std.mem.eql(u8, cmd, "--version") or std.mem.eql(u8, cmd, "-v")) {
        return Command{ .version = {} };
    }

    // Parse commands
    if (std.mem.eql(u8, cmd, "generate")) {
        return parseGenerate(allocator, args[2..]);
    } else if (std.mem.eql(u8, cmd, "logtime")) {
        return parseLogtime(allocator, args[2..]);
    } else if (std.mem.eql(u8, cmd, "open")) {
        return parseOpen(allocator, args[2..]);
    } else if (std.mem.eql(u8, cmd, "tui")) {
        return Command{ .tui = {} };
    } else if (std.mem.eql(u8, cmd, "config")) {
        return parseConfig(allocator, args[2..]);
    }

    return types.AppError.InvalidArgument;
}

fn parseGenerate(allocator: std.mem.Allocator, args: []const []const u8) !Command {
    _ = allocator;
    var opts = GenerateOpts{};

    var i: usize = 0;
    while (i < args.len) : (i += 1) {
        const arg = args[i];
        if (std.mem.eql(u8, arg, "--format") or std.mem.eql(u8, arg, "-f")) {
            if (i + 1 >= args.len) return types.AppError.InvalidArgument;
            opts.output_format = args[i + 1];
            i += 1;
        }
    }

    return Command{ .generate = opts };
}

fn parseLogtime(allocator: std.mem.Allocator, args: []const []const u8) !Command {
    _ = allocator;

    if (args.len < 1) {
        return types.AppError.InvalidArgument;
    }

    var opts = LogtimeOpts{
        .entries = args[0],
    };

    var i: usize = 1;
    while (i < args.len) : (i += 1) {
        const arg = args[i];
        if (std.mem.eql(u8, arg, "--date") or std.mem.eql(u8, arg, "-d")) {
            if (i + 1 >= args.len) return types.AppError.InvalidArgument;
            opts.date = args[i + 1];
            i += 1;
        } else if (std.mem.eql(u8, arg, "--description") or std.mem.eql(u8, arg, "-m")) {
            if (i + 1 >= args.len) return types.AppError.InvalidArgument;
            opts.description = args[i + 1];
            i += 1;
        }
    }

    return Command{ .logtime = opts };
}

fn parseOpen(allocator: std.mem.Allocator, args: []const []const u8) !Command {
    _ = allocator;

    if (args.len < 1) {
        return types.AppError.InvalidArgument;
    }

    return Command{ .open = .{ .ticket_id = args[0] } };
}

fn parseConfig(allocator: std.mem.Allocator, args: []const []const u8) !Command {
    _ = allocator;

    if (args.len < 1) {
        return Command{ .config = .show }; // Default to show
    }

    const subcmd = args[0];
    if (std.mem.eql(u8, subcmd, "show")) {
        return Command{ .config = .show };
    } else if (std.mem.eql(u8, subcmd, "init")) {
        return Command{ .config = .init };
    }

    return types.AppError.InvalidArgument;
}

/// Print help message
pub fn printHelp(writer: anytype) !void {
    try writer.writeAll(
        \\jira-report - Jira Daily Report CLI
        \\
        \\Usage:
        \\  jira-report <command> [options]
        \\
        \\Commands:
        \\  generate              Generate daily standup report
        \\  logtime <entries>     Log time to Tempo
        \\  open <ticket>         Open ticket in browser
        \\  tui                   Launch terminal UI
        \\  config <show|init>    Manage configuration
        \\
        \\Options:
        \\  -h, --help           Show this help message
        \\  -v, --version        Show version
        \\
        \\Examples:
        \\  jira-report generate
        \\  jira-report logtime "B2B-1079 2h"
        \\  jira-report logtime "B2B-1079 2h" --date yesterday
        \\  jira-report logtime "B2B-1079 2h, PROJ-123 1.5h" --description "Bug fix"
        \\  jira-report open B2B-1079
        \\  jira-report tui
        \\  jira-report config show
        \\  jira-report config init
        \\
        \\Environment Variables:
        \\  JIRA_SERVER          Jira server URL
        \\  JIRA_USERNAME        Jira username/email
        \\  JIRA_API_TOKEN       Jira API token
        \\  TEMPO_API_TOKEN      Tempo API token
        \\  TIMEZONE             Timezone (default: Australia/Sydney)
        \\
        \\Config File:
        \\  ~/.jira-report.json
        \\
    );
}

/// Print version
pub fn printVersion(writer: anytype) !void {
    try writer.writeAll("jira-report 0.1.0\n");
}

test "parse help command" {
    const allocator = std.testing.allocator;
    const args = [_][]const u8{ "jira-report", "--help" };
    const cmd = try parse(allocator, &args);
    try std.testing.expect(std.meta.activeTag(cmd) == .help);
}

test "parse generate command" {
    const allocator = std.testing.allocator;
    const args = [_][]const u8{ "jira-report", "generate" };
    const cmd = try parse(allocator, &args);
    try std.testing.expect(std.meta.activeTag(cmd) == .generate);
}

test "parse logtime command" {
    const allocator = std.testing.allocator;
    const args = [_][]const u8{ "jira-report", "logtime", "B2B-1079 2h" };
    const cmd = try parse(allocator, &args);
    try std.testing.expect(std.meta.activeTag(cmd) == .logtime);
    try std.testing.expectEqualStrings("B2B-1079 2h", cmd.logtime.entries);
}

test "parse config command" {
    const allocator = std.testing.allocator;
    const args = [_][]const u8{ "jira-report", "config", "show" };
    const cmd = try parse(allocator, &args);
    try std.testing.expect(std.meta.activeTag(cmd) == .config);
    try std.testing.expectEqual(ConfigSubcommand.show, cmd.config);
}
