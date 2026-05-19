#!/usr/bin/env Rscript

message("=== NETWORK CONNECTIVITY TEST ===")

# Get database connection info
db_host <- Sys.getenv("NETBALL_STATS_DB_HOST", "localhost")
db_port <- Sys.getenv("NETBALL_STATS_DB_PORT", "5432")

message(sprintf("Testing connectivity to database at %s:%s", db_host, db_port))

# Test basic network connectivity (can we resolve the hostname?)
message("\\n1. Testing hostname resolution...")
hostname_resolution <- tryCatch({
  ip_address <- system2("nslookup", args = db_host, stdout = TRUE, stderr = TRUE)
  message("✅ nslookup result:")
  for (line in ip_address) {
    message(sprintf("  %s", line))
  }
  TRUE
}, error = function(e) {
  message(sprintf("❌ nslookup failed: %s", conditionMessage(e)))
  FALSE
})

# Test if we can connect to the port
message("\\n2. Testing TCP port connectivity...")
port_connectivity <- tryCatch({
  # Use nc (netcat) to test if port is reachable
  result <- system2("nc", args = c("-z", "-v", db_host, db_port), stdout = TRUE, stderr = TRUE)
  message("✅ Port connectivity test result:")
  for (line in result) {
    message(sprintf("  %s", line))
  }
  TRUE
}, error = function(e) {
  message(sprintf("❌ Port connectivity test failed: %s", conditionMessage(e)))
  FALSE
})

# Test ping to the host (optional)
message("\\n3. Testing ping connectivity...")
ping_result <- tryCatch({
  result <- system2("ping", args = c("-c", "3", db_host), stdout = TRUE, stderr = TRUE)
  message("✅ Ping result:")
  for (line in result) {
    message(sprintf("  %s", line))
  }
  TRUE
}, error = function(e) {
  message(sprintf("❌ Ping failed: %s", conditionMessage(e)))
  FALSE
})

message("\\n=== NETWORK TEST SUMMARY ===")
message(sprintf("Hostname Resolution: %s", ifelse(hostname_resolution, "SUCCESS", "FAILED")))
message(sprintf("Port Connectivity: %s", ifelse(port_connectivity, "SUCCESS", "FAILED")))
message(sprintf("Ping Connectivity: %s", ifelse(ping_result, "SUCCESS", "FAILED")))

if (hostname_resolution && port_connectivity) {
  message("🎉 Network connectivity appears to be working!")
} else {
  message("❌ Network connectivity issues detected.")
}