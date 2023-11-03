export type Sign =
    | "="
    | "<"
    | ">"
    | "<="
    | ">="
    | "!="
    | "is not"
    | "~"
    | "in"
    | "not in"
    | "!~"
    | "was"
    | "was in"
    | "was not in"
    | "was not"
    | "changed";

export type JqlStatement = {
    left: string;
    sign: Sign;
    right: string | number | string[] | number[];
};

export type OrderByOperator = {
    field: string;
    type: "asc" | "desc";
};

export type Operator = {
    type: "and" | "or";
    jql: JqlGen;
};

export class JqlGen {
    private statement?: JqlStatement;
    private externalStatement?: string;

    private operators: Operator[];
    private orderByOperators: OrderByOperator[];

    constructor(statement?: JqlStatement) {
        this.statement = statement;
        this.operators = [];
        this.orderByOperators = [];
        return this;
    }

    and(statement: JqlGen | JqlStatement): JqlGen {
        const jql = statement instanceof JqlGen ? statement : new JqlGen(statement);
        this.forwardOrderBy(jql);

        this.operators.push({
            jql,
            type: "and",
        });
        return this;
    }

    or(statement: JqlGen | JqlStatement): JqlGen {
        const jql = statement instanceof JqlGen ? statement : new JqlGen(statement);
        this.forwardOrderBy(jql);

        this.operators.push({
            jql,
            type: "or",
        });
        return this;
    }

    orderBy(orderByItem: OrderByOperator): JqlGen {
        this.orderByOperators.push(orderByItem);
        return this;
    }

    injectExternal(str: string): JqlGen {
        const orderByStr = "order by";
        const orderByIndex = str.toLowerCase().lastIndexOf(orderByStr);

        const base = (orderByIndex !== -1 ? str.slice(0, orderByIndex) : str).trim();
        const orderBy = (
            orderByIndex !== -1 ? str.slice(orderByIndex + orderByStr.length) : undefined
        )?.trim();

        this.externalStatement = base;

        orderBy
            ?.split(",")
            .map(x => x.trim())
            // don't touch order by order on external sql
            .reverse()
            .forEach(by => {
                const bySpace = by.split(" ").filter(x => !!x);
                this.orderBy({
                    field: bySpace[0]!,
                    type: bySpace.at(-1)!.toLowerCase() as "asc" | "desc",
                });
            });

        return this;
    }

    toString(): string {
        const base = this.toStringOperators();
        const orderBy = this.toStringOrderBy();
        return [base, orderBy].join(" ").trim();
    }

    private forwardOrderBy(from: JqlGen): void {
        this.orderByOperators.unshift(...from.orderByOperators);
    }

    private toStringStatement(): string | undefined {
        if (!this.statement && !this.externalStatement) return;

        if (!this.statement) {
            return `(${this.externalStatement})`;
        }

        let right: string = "";
        if (
            typeof this.statement.right === "number" ||
            (typeof this.statement.right === "string" &&
                this.statement.right.toLowerCase() === "empty")
        ) {
            right = this.statement.right.toString();
        } else if (Array.isArray(this.statement.right)) {
            right = "(";
            right += this.statement.right
                .map(x => (typeof x === "number" ? x : `'${x}'`))
                .join(",");
            right += ")";
        } else {
            right = `'${this.statement.right}'`;
        }

        let str = "(";

        str += this.statement.left + " ";
        str += this.statement.sign + " ";
        str += right;

        if (this.externalStatement) {
            str += ` and (${this.externalStatement})`;
        }

        str += ")";

        return str;
    }

    private toStringOperators(): string {
        const baseStatement = this.toStringStatement();

        let str = "(";
        str += baseStatement || "";
        str += baseStatement ? " " : "";

        const nested = this.operators
            .map(op => ({
                operator: op.jql.toStringOperators(),
                type: op.type,
            }))
            .filter(x => !!x.operator)
            .map(({ operator, type }, i) => {
                if (i === 0 && !baseStatement) {
                    return operator;
                }

                return `${type} ${operator}`;
            })
            .filter(x => !!x);

        if (nested.length === 0) {
            return baseStatement || "";
        }

        str += nested.join(" ");
        str += ")";

        return str;
    }

    private toStringOrderBy(): string {
        const withoutDupes = this.orderByOperators.filter(
            (a, i) => this.orderByOperators.findLastIndex(b => a.field === b.field) === i
        );
        withoutDupes.reverse();

        if (withoutDupes.length === 0) return "";

        const toString = (item: OrderByOperator) => [item.field, item.type].join(" ");
        let str = ["order by", toString(withoutDupes[0]!)].join(" ");

        for (let i = 1; i < withoutDupes.length; i++) {
            str += `, ${toString(withoutDupes[i]!)}`;
        }

        return str;
    }
}

/** if you're lazy, hey I don't blame you, tiny wrapper to not spam new new new */
export function jql(statement?: JqlStatement) {
    return new JqlGen(statement);
}
