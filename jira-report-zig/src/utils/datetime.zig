const std = @import("std");

/// Format current date as YYYY-MM-DD
pub fn formatToday(allocator: std.mem.Allocator) ![]const u8 {
    const timestamp = std.time.timestamp();
    const epoch_seconds = @as(i64, @intCast(timestamp));
    const epoch_day = @divFloor(epoch_seconds, std.time.s_per_day);
    const year_day = @rem(@as(i32, @intCast(epoch_day)), 365);
    const year = @as(i32, @intCast(@divFloor(epoch_day, 365))) + 1970;

    // Simple date calculation (placeholder for Phase 1)
    // TODO: Use zeit library in Phase 2 for proper timezone handling
    const month: i32 = @divFloor(year_day, 30) + 1;
    const day: i32 = @rem(year_day, 30) + 1;

    return std.fmt.allocPrint(allocator, "{d:0>4}-{d:0>2}-{d:0>2}", .{ year, month, day });
}

/// Format yesterday's date as YYYY-MM-DD
pub fn formatYesterday(allocator: std.mem.Allocator) ![]const u8 {
    _ = allocator;
    // TODO: Implement in Phase 2 with proper date arithmetic
    return error.NotImplemented;
}

/// Parse date string (today, yesterday, or YYYY-MM-DD)
pub fn parseDate(allocator: std.mem.Allocator, date_str: []const u8) ![]const u8 {
    if (std.mem.eql(u8, date_str, "today")) {
        return formatToday(allocator);
    } else if (std.mem.eql(u8, date_str, "yesterday")) {
        return formatYesterday(allocator);
    } else {
        // Validate YYYY-MM-DD format
        if (date_str.len != 10) return error.InvalidDateFormat;
        if (date_str[4] != '-' or date_str[7] != '-') return error.InvalidDateFormat;

        // Return as-is if valid
        return allocator.dupe(u8, date_str);
    }
}

/// Parse time duration (2h, 1.5h, 30m, 1h 30m)
pub fn parseDuration(duration_str: []const u8) !u32 {
    var total_seconds: u32 = 0;
    var iter = std.mem.tokenizeAny(u8, duration_str, " ");

    while (iter.next()) |token| {
        if (std.mem.endsWith(u8, token, "h")) {
            const hours_str = token[0 .. token.len - 1];
            const hours = try std.fmt.parseFloat(f32, hours_str);
            total_seconds += @as(u32, @intFromFloat(hours * 3600.0));
        } else if (std.mem.endsWith(u8, token, "m")) {
            const minutes_str = token[0 .. token.len - 1];
            const minutes = try std.fmt.parseInt(u32, minutes_str, 10);
            total_seconds += minutes * 60;
        }
    }

    if (total_seconds == 0) return error.InvalidDuration;
    return total_seconds;
}

test "parse duration 2h" {
    const seconds = try parseDuration("2h");
    try std.testing.expectEqual(@as(u32, 7200), seconds);
}

test "parse duration 1.5h" {
    const seconds = try parseDuration("1.5h");
    try std.testing.expectEqual(@as(u32, 5400), seconds);
}

test "parse duration 30m" {
    const seconds = try parseDuration("30m");
    try std.testing.expectEqual(@as(u32, 1800), seconds);
}

test "parse duration 1h 30m" {
    const seconds = try parseDuration("1h 30m");
    try std.testing.expectEqual(@as(u32, 5400), seconds);
}
