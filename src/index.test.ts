import { expect, it } from "@jest/globals";

import { jql, JqlGen } from "./index";

function veryDeep(nest?: JqlGen) {
    const j = jql().and(jql().or(jql())).or(jql().and(jql()));
    if (nest) {
        j.and(jql().and(jql().or(jql().and(nest))));
    }
    return j;
}

it("doesn't do anything if no data no matter what", () => {
    const output = veryDeep().and(jql().injectExternal(""));
    expect(output.toString()).toBe("");
});

it("don't care how deep it is brother", () => {
    const output = veryDeep(jql({ left: "a", sign: "=", right: "b" })).and(
        jql({ left: "x", sign: "!=", right: "d" })
    );
    expect(output.toString()).toBe("(((((a = 'b')))) and (x != 'd'))");
});

it("usual simple nested", () => {
    const output = jql({ left: "a", sign: "=", right: "b" }).or(
        jql({
            left: "c",
            sign: "<",
            right: "d",
        }).and(
            jql({
                left: "e",
                sign: "~",
                right: "f",
            })
        )
    );

    expect(output.toString()).toBe("((a = 'b') or ((c < 'd') and (e ~ 'f')))");
});

it("simple order by", () => {
    const output = jql({ left: "a", sign: "=", right: "b" }).orderBy({
        field: "summary",
        type: "asc",
    });

    expect(output.toString()).toBe("(a = 'b') order by summary asc");
});

it("simple order by double", () => {
    const output = jql({ left: "a", sign: "=", right: "b" })
        .orderBy({
            field: "summary",
            type: "asc",
        })
        .orderBy({
            field: "issuekey",
            type: "desc",
        });

    expect(output.toString()).toBe("(a = 'b') order by issuekey desc, summary asc");
});

it("inject external jql gets anded with the base query", () => {
    const output = veryDeep(jql({ left: "a", sign: "=", right: "b" }).injectExternal("a=b"));
    expect(output.toString()).toBe("(((((a = 'b' and (a=b))))))");
});

it("inject external jql as normal statement without base query", () => {
    const output = veryDeep(jql().injectExternal("a=b"));
    expect(output.toString()).toBe("(((((a=b)))))");
});

it("order by gets forwarded to parents", () => {
    const outputDeep = veryDeep(jql().orderBy({ field: "a", type: "asc" }));
    const outputSimple = jql().orderBy({ field: "a", type: "asc" });

    expect(outputDeep.toString()).toBe(outputSimple.toString());
    expect(outputDeep.toString()).toBe("order by a asc");
});

it("order by gets forwarded to parents, simple", () => {
    const output = jql()
        .orderBy({ field: "parent", type: "asc" })
        .and(jql().orderBy({ field: "child", type: "asc" }));

    expect(output.toString()).toBe("order by parent asc, child asc");
});

it("order by order from child to parent", () => {
    const output = jql()
        .and(jql().orderBy({ field: "child", type: "asc" }))
        .orderBy({ field: "parent", type: "asc" });

    expect(output.toString()).toBe("order by parent asc, child asc");
});

it("order by duplicate field names are overriden by parent", () => {
    const output = jql()
        .and(
            jql()
                .orderBy({ field: "x", type: "asc" })
                .orderBy({ field: "x", type: "asc" })
                .and(jql().orderBy({ field: "x", type: "asc" }))
        )
        .orderBy({ field: "x", type: "desc" });

    expect(output.toString()).toBe("order by x desc");
});

it("order by with injected jql", () => {
    const output = jql()
        .and(
            jql()
                .injectExternal("a=a order by a asc, b asc")
                .and(jql().injectExternal("order by aa asc, bb asc"))
        )
        .orderBy({ field: "c", type: "asc" })
        .orderBy({ field: "d", type: "asc" });

    expect(output.toString()).toBe(
        "((a=a)) order by d asc, c asc, a asc, b asc, aa asc, bb asc"
    );
});

it("[injectExternal] order by gets extracted correctly", () => {
    const output = jql().injectExternal("order by    a    asc    ,   b   desc");
    expect(output.toString()).toBe("order by a asc, b desc");
});

it("[injectExternal] order by correct order override full", () => {
    const output = jql()
        .and(jql().injectExternal("order by a asc, b desc"))
        .orderBy({
            field: "a",
            type: "asc",
        })
        .orderBy({
            field: "b",
            type: "asc",
        });

    expect(output.toString()).toBe("order by b asc, a asc");
});

it("[injectExternal] order by correct order override half", () => {
    const output = jql()
        .and(jql().injectExternal("order by a asc, b asc, c asc, d asc"))
        .orderBy({
            field: "a",
            type: "asc",
        })
        .orderBy({
            field: "b",
            type: "asc",
        });

    expect(output.toString()).toBe("order by b asc, a asc, c asc, d asc");
});

it("[injectExternal] order by correct order only external", () => {
    const output = jql()
        .and(jql().injectExternal("order by a asc, b asc, c asc, d asc"))
        .injectExternal("order by xd asc, b asc, c asc ");

    expect(output.toString()).toBe("order by xd asc, b asc, c asc, a asc, d asc");
});

it("readme case", () => {
    const output = jql({ left: "summary", sign: "=", right: "nice" })
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
        .orderBy({ field: "issuekey", type: "asc" });

    expect(output.toString()).toBe(
        "((summary = 'nice') and (summary != 'look mom, im cool') or ((foo in (1,2,3)) and (bar != 2))) order by issuekey asc"
    );
});

it("beast mode example", () => {
    const output = jql({
        left: "c",
        sign: "<",
        right: "d",
    }).and(
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
    );

    expect(output.toString()).toBe(
        "((c < 'd') and ((e ~ 'f') or ((g > 'h') and ((i = 'j') or ((k != 'l') and ((m is not 'n') or ((o in ('p','q','r')) and ((s not in ('t','u','v')) or ((w !~ 'x') and ((y was 'z') or ((aa was in 'bb') and (cc was not in 'dd')))))))))))) order by three desc, two asc, one desc"
    );
});

it.each(["empty", "null"] as const)("does not escape %s", arg => {
    const output = jql({ left: "foo", sign: "is", right: arg }).toString();

    expect(output).toBe(`(foo is ${arg})`);
});

it("escapes single quotes", () => {
    const output = jql({ left: "foo", sign: "=", right: "foo 'bar'" }).toString();

    expect(output).toBe(`(foo = 'foo \\'bar\\'')`);
});

it("escapes backslash", () => {
    let output = jql({ left: "foo", sign: "=", right: "foo\\" }).toString();

    expect(output).toBe("(foo = 'foo\\\\')");

    output = jql({ left: "x", sign: "=", right: "\\\\" }).toString();

    expect(output).toBe("(x = '\\\\\\\\')");
});
