// Signalling message parser.
// Parses messages of this type:
// TOKEN VAL123
pub fn parse(message: &str) -> Option<(&str, &str)> {
  let mut iter = message.split_ascii_whitespace();

  let token = iter.next();
  let value = iter.next();

  if token.is_some() && value.is_some() {
    return Some((token.unwrap(), value.unwrap()));
  }

  return None;
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
    fn test_positive_parse() {
        let (token, value) = parse(r#"HELLO 123"#).unwrap();
        assert_eq!(token, "HELLO");
        assert_eq!(value, "123");
    }

    #[test]
    fn test_negative_parse() {
      let parsed = parse (r#"MALFORMED"#);

      assert_eq!(parsed, None);
    }
}