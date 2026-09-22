# Contract: URL Query Game Configuration

## Supported input

| Query field | Accepted value |
|---|---|
| `lives` | Base-10 integer from 1 through 5 |
| `crossingsToWin` | Base-10 integer from 1 through 10 |
| `difficulty` | `easy`, `normal`, or `hard` |

Unknown fields are ignored. Missing supported fields use their individual defaults when every present supported field is valid.

## Successful resolution

The valid example `?lives=2&crossingsToWin=3&difficulty=hard` resolves to those three values, reports no invalid fields, and does not use the complete fallback.

## Invalid resolution

Unparsable numbers, fractional numbers, out-of-range numbers, and unsupported difficulty values are invalid. If any present supported field is invalid:

- all three active values become `3`, `3`, and `normal`;
- every invalid supported field name is reported once;
- valid supplied fields are also discarded;
- the application remains playable and displays the invalid field names.

Required invalid examples are `lives=0`, `lives=2.5`, `lives=abc`, `crossingsToWin=11`, and `difficulty=insane`.
