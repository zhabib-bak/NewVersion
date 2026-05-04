-- MySQL Migration Script for freesqldatabase.com
-- Run this script directly in your new database (sql7825288)

-- Clear existing data (preserve structure)
DELETE FROM ticket_comments;
DELETE FROM session_tokens;
DELETE FROM ticket_audit_log;
DELETE FROM saved_filters;
DELETE FROM tickets;
DELETE FROM user_accounts;

-- Insert user accounts
INSERT INTO user_accounts (id, name, role, active, auth_pin_hash, auth_secret_hash, password_reset_required, failed_login_attempts, locked_until, email, created_at, updated_at) VALUES
(1, 'Chandra', 'user', 1, NULL, 'scrypt:afdc15ef13862ad11797eb26e799ae3c:f5dacc6d3e180028041f644fd36a13518227d5ceed13ab17225eeff6480869fed60395433c070239178ddc8310eae7f8e040b4cf055045d9c827c1e3954a753a', 1, 0, NULL, '', '2026-05-01 08:57:03', '2026-05-01 08:57:03'),
(2, 'Nicoleta', 'user', 1, NULL, 'scrypt:a2f1b64960f4f6009de47c7c08e09972:5a9a93d341e751651781077cdd3b195eb244351aeef959bf5b98628692727b85ab1ba1527fd4d930a15596605f232193198ccc9205e54152f32eb82492f0301c', 1, 0, NULL, '', '2026-05-01 08:57:03', '2026-05-01 08:57:03'),
(3, 'Loan', 'user', 1, NULL, 'scrypt:af513811227ed2200f2c972a27406344:e6561d0446aa0935f9a1f3844415dee36207b447adc90ffe38500d49d9c8cece988b3a16bfe3faa79df32b4df436314c9ee6768848fa15e4840abf3fcbe9345b', 1, 0, NULL, '', '2026-05-01 08:57:03', '2026-05-01 08:57:03'),
(4, 'Samuel', 'user', 1, NULL, 'scrypt:eff5e5a8ef7bfd463b5d0b70c6b4ca8d:4bf631e75f3786b9bfa668febdb692bf00dcbbc5d74fdf97420ac22dc2a7e6caf3a334d268617ecbd7ee6f469203eb774912c97dd48fef0f80f0a8497065a869', 1, 0, NULL, '', '2026-05-01 08:57:03', '2026-05-01 08:57:03'),
(5, 'Mohamad', 'user', 1, NULL, 'scrypt:a7fd692316a43ca74c76f5b7291f513e:894929cd0e09dc5d39a27af729a1e5dd3edaecc0faeb678781f75e40419eeed63a1c2d6d760e8bd5d87ebf4b2d98bb0e1010e77bf01bd4665a4cf0b293a560a9', 1, 0, NULL, '', '2026-05-01 08:57:03', '2026-05-01 08:57:03'),
(6, 'Ana', 'user', 1, NULL, 'scrypt:3a21c9dcb2b61f20ad3d8773c9e983b2:0dac86f97a79e8aba63643c557f0736c3a143ca45b745fbd53c080fa70715f18b0624dec81f991979a4b897f4deaff7b4909c04752c0ffdb7ea043b3aec15c52', 1, 0, NULL, '', '2026-05-01 08:57:04', '2026-05-01 08:57:04'),
(7, 'Andrea', 'user', 1, NULL, 'scrypt:ae0c706f82680b9bfb11c20f378df182:d4db43ff835ab4e5363130a6283920ceada4a26ea864dc94d7833597a60b032204274133d64f8d94005cd9a84557543ffaa4576865bd808cd0dffcbaf660552c', 1, 0, NULL, '', '2026-05-01 08:57:04', '2026-05-01 08:57:04'),
(8, 'Alexandra', 'user', 1, NULL, 'scrypt:24512f1797e91609755e00d3031f5ca7:0a565103126b7b5c2c86cfe4dc9023b712df625fb2956cea651468f8c86a6311a86f17cd840c6ae5a9adf68c96fcae376a57f1ee94c0a692d503cac4abe6fa5d', 1, 0, NULL, '', '2026-05-01 08:57:04', '2026-05-01 08:57:04'),
(9, 'Radulesco', 'user', 1, NULL, 'scrypt:b58bf4f60a1dbdfc4f0fc43d0332a280:ca7ff17526da7b90ef7cad6be8f42e5eaae80ec66dc890ac6fd32c4f92798e78bbad1525bd0baedf40a9ce9dce42d9420bc3532a77a428b00171af2dbb697242', 1, 0, NULL, '', '2026-05-01 08:57:04', '2026-05-01 08:57:04'),
(10, 'Oliwia', 'user', 1, NULL, 'scrypt:d795dc3bbd76ef46487a0b1a7aa4fea9:e2491ec4ca7574c93c5e572a02fcd1cc8fd7aa0b4faf97b870ac78a77bd34694f523fa73242a68061f726783e5205d51682ca3c388b6ae63b26284c67a68bd6b', 1, 0, NULL, '', '2026-05-01 08:57:04', '2026-05-01 08:57:04'),
(11, 'Madalin', 'user', 1, NULL, 'scrypt:0b5536e8470a236e7deb22f3a997eabd:8ee53e5c49ab952b4a8af2389a496066577d030077d2b7ad97c027e8123388323352aa419cc47bdee7fb3e618af4253ca443447f57c93551b2a9231154b6e096', 1, 0, NULL, '', '2026-05-01 08:57:04', '2026-05-01 08:57:04'),
(12, 'Adriano', 'admin', 1, NULL, 'scrypt:3540442aaf6e54f4a243573a24098992:21a8e2d4ae6da083fddfc48334d7eb44d1df0a8842ee536e32d6c8dce10f14fd17ba3278d72ba3ad2d785112042e1889770121a74c027df815f2cce4eae7810a', 1, 0, NULL, '', '2026-05-01 08:57:04', '2026-05-01 17:23:53'),
(13, 'Zacarias', 'admin', 1, NULL, 'scrypt:d2311ae2fd4e767bb2c528eaeb270d34:7c409a2a8634ff0a56b68edb191b1e429a43082a13ddcf5cd5e415128130868e5df7ab176cdc3dd20e585c578751946d9e21063b7f1c1f689aee01e8e830f5ae', 1, 0, NULL, '', '2026-05-01 08:57:05', '2026-05-03 00:55:47'),
(14, 'Jawad', 'admin', 1, NULL, 'scrypt:b6c93ad2438a60512e9eafc4d5e5f4f9:f02ddff82ca6442b950d95233fe52490cccef0662c396bc767e23c1bdb9ebfbbc80fbfe76a567037431628e9dd469bbd4ab75d94e5e4108af6b845c6865c9f36', 1, 0, NULL, '', '2026-05-01 08:57:05', '2026-05-03 01:25:30');

-- Insert tickets
INSERT INTO tickets (id, description, jd_ticket_number, category, updates_comments, priority, date_opening, date_closed, status, assignee, manager, due_date, reopened_count, batch_id, created_at, updated_at) VALUES
(1, 'WMS label printer issue in outbound lane', '6914450', 'WMS', 'Investigating printer queue and spooler resets.', 'P1 high', '2026-05-01', NULL, 'Open', 'Samuel', 'Zacarias', '2026-05-02', 0, NULL, '2026-05-01 08:57:06', '2026-05-01 08:57:06'),
(2, 'Inbound ASN mismatch for supplier load', '6914451', 'Inbound', 'Validated supplier file. Waiting for warehouse confirmation.', 'P2 medium', '2026-04-29', NULL, 'In Progress', 'Ana', 'Adriano', '2026-05-02', 0, NULL, '2026-05-01 08:57:06', '2026-05-01 08:57:06'),
(3, 'CR to update shuttle routing thresholds', '6914452', 'CR', 'Change request approved by operations.', 'P2 medium', '2026-04-26', '2026-04-30', 'Closed', 'Loan', 'Jawad', '2026-04-29', 0, NULL, '2026-05-01 08:57:06', '2026-05-01 08:57:06'),
(4, 'Inventory discrepancy in zone C12', '6914453', 'Inventory', 'Cycle count requested. Potential location swap.', 'P3 low', '2026-04-27', NULL, 'Blocked', 'Oliwia', 'Adriano', '2026-05-04', 0, NULL, '2026-05-01 08:57:06', '2026-05-01 08:57:06'),
(5, 'Scada alarm flooding operators', '6914454', 'Scada', 'Reviewed logs and escalated to controls vendor.', 'P1 high', '2026-04-24', NULL, 'In Progress', 'Mohamad', 'Jawad', '2026-04-25', 0, NULL, '2026-05-01 08:57:06', '2026-05-01 08:57:06'),
(6, 'Test ticket for debugging', 'TEST-1777771422757', 'Technical', 'Test comment', 'P2 medium', '2026-05-03 01:23:42', NULL, 'Open', 'zacarias', 'zacarias', '2026-05-10 01:23:42', 0, NULL, '2026-05-03 01:23:42', '2026-05-03 01:23:42'),
(7, 'Test ticket from API simulation', 'API-SIM-1777771555611', 'Technical', 'Test comment from API simulation', 'P2 medium', '2026-05-03 01:25:55', '', 'Open', 'zacarias', 'zacarias', '2026-05-10 01:25:55', 0, NULL, '2026-05-03 01:25:55', '2026-05-03 01:25:55'),
(8, 'Fixed test ticket', 'FIXED-1777771579808', 'Technical', 'Test comment for fix', 'P2 medium', '2026-05-03 01:26:19', NULL, 'Open', 'zacarias', 'zacarias', '2026-05-10 01:26:19', 0, NULL, '2026-05-03 01:26:19', '2026-05-03 01:26:19');

-- Insert ticket comments
INSERT INTO ticket_comments (id, ticket_id, author, comment_type, body, created_at) VALUES
(1, 1, 'Samuel', 'Update', 'Investigating printer queue and spooler resets.', '2026-05-01 08:57:07'),
(2, 2, 'Ana', 'Update', 'Validated supplier file. Waiting for warehouse confirmation.', '2026-05-01 08:57:07'),
(3, 3, 'Loan', 'Update', 'Change request approved by operations.', '2026-05-01 08:57:07'),
(4, 4, 'Oliwia', 'Update', 'Cycle count requested. Potential location swap.', '2026-05-01 08:57:07'),
(5, 5, 'Mohamad', 'Update', 'Reviewed logs and escalated to controls vendor.', '2026-05-01 08:57:07'),
(6, 6, 'zacarias', 'Update', 'Test comment', '2026-05-03 01:25:29');

-- Insert session tokens
INSERT INTO session_tokens (id, user_id, csrf_token, expires_at, created_at, last_seen_at) VALUES
('8c81099b-c352-4781-9e26-79f967424063', 13, 'db63fb7c04079d63c0e2387bdeca0157e8504359b01e7132', '2026-05-03T12:57:37.247Z', '2026-05-03 00:57:37', '2026-05-03 00:57:37');

-- Insert audit log
INSERT INTO ticket_audit_log (id, entity_type, entity_id, action, actor, details_json, created_at) VALUES
(1, 'session', 13, 'login', 'Zacarias', '{\"ip\":\"::ffff:127.0.0.1\"}', '2026-05-03 00:57:37');

-- Reset auto-increment counters
ALTER TABLE user_accounts AUTO_INCREMENT = 569;
ALTER TABLE tickets AUTO_INCREMENT = 9;
ALTER TABLE ticket_comments AUTO_INCREMENT = 7;
ALTER TABLE ticket_audit_log AUTO_INCREMENT = 2;

-- Migration completed successfully!
SELECT 'Migration completed!' as status;
