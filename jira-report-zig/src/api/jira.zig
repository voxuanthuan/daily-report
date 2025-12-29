const std = @import("std");
const types = @import("../core/types.zig");
const config = @import("../core/config.zig");

/// Jira API client (stub for Phase 1)
/// Will be implemented in Phase 2
pub const Client = struct {
    allocator: std.mem.Allocator,
    config: config.Config,

    pub fn init(allocator: std.mem.Allocator, cfg: config.Config) Client {
        return Client{
            .allocator = allocator,
            .config = cfg,
        };
    }

    /// Fetch tasks assigned to user (stub)
    pub fn fetchTasks(self: *Client) ![]types.Task {
        _ = self;
        // TODO: Implement in Phase 2
        return error.NotImplemented;
    }

    /// Get task details (stub)
    pub fn getTask(self: *Client, ticket_id: []const u8) !types.Task {
        _ = self;
        _ = ticket_id;
        // TODO: Implement in Phase 2
        return error.NotImplemented;
    }

    pub fn deinit(self: *Client) void {
        _ = self;
    }
};
