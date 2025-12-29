const std = @import("std");
const config = @import("../core/config.zig");

/// TUI application (stub for Phase 1)
/// Will be implemented in Phase 4 with libvaxis
pub const App = struct {
    allocator: std.mem.Allocator,
    config: config.Config,

    pub fn init(allocator: std.mem.Allocator, cfg: config.Config) App {
        return App{
            .allocator = allocator,
            .config = cfg,
        };
    }

    /// Run the TUI application (stub)
    pub fn run(self: *App) !void {
        _ = self;
        // TODO: Implement in Phase 4 with libvaxis
        return error.NotImplemented;
    }

    pub fn deinit(self: *App) void {
        _ = self;
    }
};
