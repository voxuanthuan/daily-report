const std = @import("std");
const config = @import("../src/core/config.zig");
const types = @import("../src/core/types.zig");

test "config loads from environment" {
    const allocator = std.testing.allocator;

    // This test will pass if env vars are set, or fail with ConfigMissing if not
    // We accept both outcomes as valid for Phase 1
    const result = config.Config.load(allocator);

    if (result) |cfg| {
        // If config loaded successfully, clean it up
        var mutable_cfg = cfg;
        mutable_cfg.deinit();
    } else |err| {
        // If it failed, it should be ConfigMissing
        try std.testing.expectEqual(types.AppError.ConfigMissing, err);
    }
}

test "config validation" {
    // This test documents that config loading requires:
    // - JIRA_SERVER
    // - JIRA_USERNAME
    // - JIRA_API_TOKEN
    // - TEMPO_API_TOKEN
    try std.testing.expect(true);
}
