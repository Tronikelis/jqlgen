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

Make it impossible to generate invalid jql with a simple yet complex api

## Features

- ✔️ Simple
- 🧪 Well tested (I use this myself in my semi big projects)
- 👌 Follows SQL order by priority [info](#a-note-about-order-by)
- 🤘 Impossible to generate invalid JQL (please open an issue if you found an edge-case)

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

## Injecting unknown jql statements

For example when you want to integrate unknown jql queries into your own, for example from a Jira filter,
there exists a simple function for that

```ts
jql().injectExternal("a = 'b' order by summary asc");
```

This is pretty the same as calling

```ts
jql({ left: "a", sign: "=", right: "b" }).orderBy({ field: "summary", type: "asc" });
```

⚠️ Note: jql validation is out of scope for this package, therefore you are responsible for calling `injectExternal` with valid jql strings

## A note about order by

You can call order by at any level, it gets resolved like this:
`final string output: [parent] asc/desc, [child-parent] asc/desc, [child-child-parent] asc/desc`

It's not the other way around, because jql sorts the first field the last, I will try to maintain sql behavior so I am reversing it

An example

```ts
const output = jql()
    .and(jql().orderBy({ field: "child", type: "asc" }))
    .orderBy({ field: "parent", type: "asc" });

expect(output.toString()).toBe("order by parent asc, child asc");
```

## API

```ts
declare class JqlGen {
    constructor(statement?: JqlStatement);
    and(statement: JqlGen | JqlStatement): JqlGen;
    or(statement: JqlGen | JqlStatement): JqlGen;
    orderBy(orderByItem: OrderByOperator): JqlGen;
    injectExternal(str: string): JqlGen;
    toString(): string;
}

/** if you're lazy, hey I don't blame you, tiny wrapper to not spam new new new */
declare function jql(statement?: JqlStatement): JqlGen;
```

## Turn on beast mode with this library 😈

Yeees, I can finally go wild with jql

```ts
const output = jql({
    left: "c",
    sign: "<",
    right: "d",
})
    .and(
        jql({ left: "e", sign: "~", right: "f" }).or(
            jql({ left: "g", sign: ">", right: "h" })
                .and(
                    jql({ left: "i", sign: "=", right: "j" }).or(
                        jql({ left: "k", sign: "!=", right: "l" }).and(
                            jql({ left: "m", sign: "is not", right: "n" }).or(
                                jql({ left: "o", sign: "in", right: ["p", "q", "r"] })
                                    .and(
                                        jql({
                                            left: "s",
                                            sign: "not in",
                                            right: ["t", "u", "v"],
                                        }).or(
                                            jql({ left: "w", sign: "!~", right: "x" }).and(
                                                jql({ left: "y", sign: "was", right: "z" }).or(
                                                    jql({
                                                        left: "aa",
                                                        sign: "was in",
                                                        right: "bb",
                                                    }).and(
                                                        jql({
                                                            left: "cc",
                                                            sign: "was not in",
                                                            right: "dd",
                                                        }).orderBy({
                                                            field: "one",
                                                            type: "desc",
                                                        })
                                                    )
                                                )
                                            )
                                        )
                                    )
                                    .orderBy({
                                        field: "two",
                                        type: "asc",
                                    })
                            )
                        )
                    )
                )
                .orderBy({ field: "three", type: "desc" })
        )
    )
    .toString();

// ((c < 'd') and ((e ~ 'f') or ((g > 'h') and ((i = 'j') or ((k != 'l') and ((m is not 'n') or ((o in ('p','q','r')) and ((s not in ('t','u','v')) or ((w !~ 'x') and ((y was 'z') or ((aa was in 'bb') and (cc was not in 'dd')))))))))))) order by three desc, two asc, one desc
```

Of course, your app should dynamically generate this stuff
