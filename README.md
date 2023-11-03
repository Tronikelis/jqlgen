<h1 align="center">jqlgen</h1>

<br />

<div align="center">

<img src="https://img.shields.io/bundlephobia/minzip/jqlgen?style=flat-square" />
<img src="https://img.shields.io/npm/v/jqlgen?style=flat-square" />
<img src="https://img.shields.io/badge/dependencies-0-success?style=flat-square" />
 
</div>

## The what

When string interpolation jql is not enough, yes I have this problem

## The goal

Make it impossible to generate invalid jql with a simple api

## Quick start 🧙

```ts
import { jql } from "jqlgen";

jql({ left: "summary", sign: "=", right: "nice" })
    .and({
        left: "summary",
        sign: "!=",
        right: "look mom, im cool",
    })
    .or(
        jql({ left: "foo", sign: "in", right: [1, 2, 3] }).and({
            left: "bar",
            sign: "!=",
            right: 2,
        })
    )
    .orderBy({ field: "issuekey", type: "asc" })
    .toString();

// ((summary = 'nice') and (summary != 'look mom, im cool') or ((foo in (1,2,3)) and (bar != 2))) order by issuekey asc
```
