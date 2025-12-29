const std = @import("std");

/// Common error types for the application
pub const AppError = error{
    ConfigMissing,
    ConfigInvalid,
    InvalidArgument,
    NetworkError,
    ApiError,
    FileError,
};

/// Task/Issue data from Jira
pub const Task = struct {
    key: []const u8,
    summary: []const u8,
    status: []const u8,
    assignee: []const u8,

    pub fn deinit(self: *Task, allocator: std.mem.Allocator) void {
        allocator.free(self.key);
        allocator.free(self.summary);
        allocator.free(self.status);
        allocator.free(self.assignee);
    }
};

/// Worklog entry for Tempo
pub const Worklog = struct {
    ticket_id: []const u8,
    time_spent_seconds: u32,
    description: []const u8,
    date: []const u8,

    pub fn deinit(self: *Worklog, allocator: std.mem.Allocator) void {
        allocator.free(self.ticket_id);
        allocator.free(self.description);
        allocator.free(self.date);
    }
};

/// Time duration representation
pub const Duration = struct {
    hours: u8,
    minutes: u8,

    pub fn toSeconds(self: Duration) u32 {
        return @as(u32, self.hours) * 3600 + @as(u32, self.minutes) * 60;
    }

    pub fn fromSeconds(seconds: u32) Duration {
        const hours = @as(u8, @intCast(seconds / 3600));
        const minutes = @as(u8, @intCast((seconds % 3600) / 60));
        return Duration{
            .hours = hours,
            .minutes = minutes,
        };
    }
};

test "Duration conversion" {
    const duration = Duration{ .hours = 2, .minutes = 30 };
    try std.testing.expectEqual(@as(u32, 9000), duration.toSeconds());

    const back = Duration.fromSeconds(9000);
    try std.testing.expectEqual(@as(u8, 2), back.hours);
    try std.testing.expectEqual(@as(u8, 30), back.minutes);
}
