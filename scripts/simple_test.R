#!/usr/bin/env Rscript
message("SIMPLE TEST RUNNING")
message(sprintf("Working directory: %s", getwd()))
message(sprintf("Files in directory: %s", paste(list.files(), collapse=", ")))