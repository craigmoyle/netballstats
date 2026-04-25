text <- tolower('how many times has nikki osbourne scored 50 goals or more?')

# Check actual whitespace
test_substr <- '50 goals or more'
cat('Test substring:', test_substr, '\n')

# Try exact with literal space
m <- regexpr('50 goals or more', text)
cat('Literal "50 goals or more":', m, '\n')

# Try with spaces as character class
m <- regexpr('[0-9]+ +or +more', text)
cat('With [space]+ pattern:', m, '\n')

# Extract to see if it works
if (m > 0) {
  match_str <- substr(text, m, m + attr(m, 'match.length') - 1)
  cat('Matched:', match_str, '\n')
  # Extract number
  num_str <- gsub(' .*', '', match_str)
  cat('Number:', num_str, '\n')
}
