#!/usr/bin/env Rscript

message("=== RUNNING NETWORK TEST INSIDE CONTAINER APP JOB ===")

# Source the network test
source("scripts/network_connectivity_test.R")

message("\\n=== END OF NETWORK TEST INSIDE JOB ===")