const std = @import("std");
const types = @import("../core/types.zig");

/// TUI state management (stub for Phase 1)
/// Will be implemented in Phase 4
pub const State = struct {
    allocator: std.mem.Allocator,
    tasks: []types.Task,
    worklogs: []types.Worklog,
    selected_task: ?usize,

    pub fn init(allocator: std.mem.Allocator) State {
        return State{
            .allocator = allocator,
            .tasks = &[_]types.Task{},
            .worklogs = &[_]types.Worklog{},
            .selected_task = null,
        };
    }

    pub fn deinit(self: *State) void {
        for (self.tasks) |*task| {
            task.deinit(self.allocator);
        }
        for (self.worklogs) |*log| {
            log.deinit(self.allocator);
        }
        self.allocator.free(self.tasks);
        self.allocator.free(self.worklogs);
    }
};
