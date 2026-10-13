import Text "mo:core/Text";
module {
  public func field(value : Text) : Text {
    let dangerous = value.startsWith(#text "=") or value.startsWith(#text "+") or value.startsWith(#text "-") or value.startsWith(#text "@") or value.startsWith(#text "\t") or value.startsWith(#text "\r");
    let safe = if (dangerous) "'" # value else value;
    "\"" # safe.replace(#text "\"", "\"\"") # "\"";
  };
};
