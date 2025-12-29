const std = @import("std");
const types = @import("../core/types.zig");
const config = @import("../core/config.zig");

/// Tempo API client (stub for Phase 1)
/// Will be implemented in Phase 3
pub const Client = struct {
    allocator: std.mem.Allocator,
    config: config.Config,

    pub fn init(allocator: std.mem.Allocator, cfg: config.Config) Client {
        return Client{
            .allocator = allocator,
            .config = cfg,
        };
    }

    /// Create worklog entry (stub)
    pub fn createWorklog(self: *Client, worklog: types.Worklog) !void {
        _ = self;
        _ = worklog;
        // TODO: Implement in Phase 3
        return error.NotImplemented;
    }

    /// Fetch worklogs for date range (stub)
    pub fn fetchWorklogs(self: *Client, start_date: []const u8, end_date: []const u8) ![]types.Worklog {
        _ = self;
        _ = start_date;
        _ = end_date;
        // TODO: Implement in Phase 3
        return error.NotImplemented;
    }

    pub fn deinit(self: *Client) void {
        _ = self;
    }
};
