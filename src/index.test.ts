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

    expect(output.toString()).toBe("(a = 'b') order by summary asc, issuekey desc");
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

it("order by order from child to parent", () => {
    const output = jql()
        .and(jql().orderBy({ field: "child", type: "asc" }))
        .orderBy({ field: "parent", type: "asc" });

    expect(output.toString()).toBe("order by child asc, parent asc");
});
