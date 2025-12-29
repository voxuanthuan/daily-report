const std = @import("std");
const types = @import("types.zig");

/// Application configuration loaded from env and/or file
pub const Config = struct {
    jira_server: []const u8,
    username: []const u8,
    api_token: []const u8,
    tempo_api_token: []const u8,
    timezone: []const u8,

    allocator: std.mem.Allocator,

    /// Load configuration from environment variables and config file
    /// Environment variables take precedence over file config
    pub fn load(allocator: std.mem.Allocator) !Config {
        var config = Config{
            .jira_server = "",
            .username = "",
            .api_token = "",
            .tempo_api_token = "",
            .timezone = "Australia/Sydney", // Default timezone
            .allocator = allocator,
        };

        // Try to load from config file first
        if (loadFromFile(allocator)) |file_config| {
            config.jira_server = file_config.jira_server;
            config.username = file_config.username;
            config.api_token = file_config.api_token;
            config.tempo_api_token = file_config.tempo_api_token;
            if (file_config.timezone.len > 0) {
                config.timezone = file_config.timezone;
            }
        } else |_| {
            // File loading failed, continue with env vars
        }

        // Override with environment variables if present
        if (std.process.getEnvVarOwned(allocator, "JIRA_SERVER")) |server| {
            if (config.jira_server.len > 0) allocator.free(config.jira_server);
            config.jira_server = server;
        } else |_| {}

        if (std.process.getEnvVarOwned(allocator, "JIRA_USERNAME")) |username| {
            if (config.username.len > 0) allocator.free(config.username);
            config.username = username;
        } else |_| {}

        if (std.process.getEnvVarOwned(allocator, "JIRA_API_TOKEN")) |token| {
            if (config.api_token.len > 0) allocator.free(config.api_token);
            config.api_token = token;
        } else |_| {}

        if (std.process.getEnvVarOwned(allocator, "TEMPO_API_TOKEN")) |token| {
            if (config.tempo_api_token.len > 0) allocator.free(config.tempo_api_token);
            config.tempo_api_token = token;
        } else |_| {}

        if (std.process.getEnvVarOwned(allocator, "TIMEZONE")) |tz| {
            if (config.timezone.len > 0 and !std.mem.eql(u8, config.timezone, "Australia/Sydney")) {
                allocator.free(config.timezone);
            }
            config.timezone = tz;
        } else |_| {}

        // Validate required fields
        if (config.jira_server.len == 0) return types.AppError.ConfigMissing;
        if (config.username.len == 0) return types.AppError.ConfigMissing;
        if (config.api_token.len == 0) return types.AppError.ConfigMissing;
        if (config.tempo_api_token.len == 0) return types.AppError.ConfigMissing;

        return config;
    }

    /// Load configuration from ~/.jira-report.json
    fn loadFromFile(allocator: std.mem.Allocator) !Config {
        const home = std.process.getEnvVarOwned(allocator, "HOME") catch |err| {
            return err;
        };
        defer allocator.free(home);

        const config_path = try std.fmt.allocPrint(allocator, "{s}/.jira-report.json", .{home});
        defer allocator.free(config_path);

        // Try to open file - if it fails, return error
        _ = std.fs.openFileAbsolute(config_path, .{}) catch |err| {
            return err;
        };

        // TODO: Parse JSON content in Phase 2
        // For now, return empty config as placeholder
        const cfg = Config{
            .jira_server = try allocator.dupe(u8, ""),
            .username = try allocator.dupe(u8, ""),
            .api_token = try allocator.dupe(u8, ""),
            .tempo_api_token = try allocator.dupe(u8, ""),
            .timezone = try allocator.dupe(u8, "Australia/Sydney"),
            .allocator = allocator,
        };

        return cfg;
    }

    /// Free allocated memory
    pub fn deinit(self: *Config) void {
        if (self.jira_server.len > 0) self.allocator.free(self.jira_server);
        if (self.username.len > 0) self.allocator.free(self.username);
        if (self.api_token.len > 0) self.allocator.free(self.api_token);
        if (self.tempo_api_token.len > 0) self.allocator.free(self.tempo_api_token);
        if (self.timezone.len > 0 and !std.mem.eql(u8, self.timezone, "Australia/Sydney")) {
            self.allocator.free(self.timezone);
        }
    }

    /// Initialize config file with default values
    pub fn init(allocator: std.mem.Allocator) !void {
        const home = try std.process.getEnvVarOwned(allocator, "HOME");
        defer allocator.free(home);

        const config_path = try std.fmt.allocPrint(allocator, "{s}/.jira-report.json", .{home});
        defer allocator.free(config_path);

        const file = try std.fs.createFileAbsolute(config_path, .{});
        defer file.close();

        const template =
            \\{
            \\  "jira_server": "https://your-domain.atlassian.net/",
            \\  "username": "your-email@example.com",
            \\  "api_token": "your-jira-api-token",
            \\  "tempo_api_token": "your-tempo-api-token",
            \\  "timezone": "Australia/Sydney"
            \\}
            \\
        ;

        try file.writeAll(template);
    }

    /// Display current configuration
    pub fn show(self: Config, writer: anytype) !void {
        try writer.print("Configuration:\n", .{});
        try writer.print("  Jira Server: {s}\n", .{self.jira_server});
        try writer.print("  Username: {s}\n", .{self.username});
        try writer.print("  API Token: {s}\n", .{"********"});
        try writer.print("  Tempo Token: {s}\n", .{"********"});
        try writer.print("  Timezone: {s}\n", .{self.timezone});
    }
};
