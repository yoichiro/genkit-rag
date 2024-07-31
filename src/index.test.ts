import { test } from "vitest";
import { chunk } from "llm-chunk";

test("chunk with delimiters", () => {
  const source = `aaa
---
bbb`;
  const actual = chunk(source, { delimiters: "---" });
  console.log(actual);
});

test("chunk with sentence splitter", () => {
  const source = `aaa
---
bbb`;
  const actual = chunk(source, { splitter: "sentence" });
  console.log(actual);
});

test("chunk with paragraph splitter", () => {
  const source = `aaa
---
bbb`;
  const actual = chunk(source, { splitter: "paragraph" });
  console.log(actual);
});

test("simple", () => {
  const source = `aaa
---
bbb`;
  const actual = source.split(new RegExp("---"));
  console.log(actual);
});
