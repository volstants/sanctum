export interface DiceResult {
  expression: string;
  rolls: number[];
  modifier: number;
  total: number;
  notation: string;
}

const DICE_REGEX = /^\/roll\s+(\d+)d(\d+)([+-]\d+)?$/i;

export function parseDiceCommand(input: string): DiceResult | null {
  const match = input.trim().match(DICE_REGEX);
  if (!match) return null;

  const count = Math.min(parseInt(match[1]), 100);
  const sides = Math.min(parseInt(match[2]), 1000);
  const modifier = parseInt(match[3] ?? '0');

  if (count < 1 || sides < 2) return null;

  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';

  return {
    expression: `${count}d${sides}${modStr}`,
    rolls,
    modifier,
    total,
    notation: `🎲 ${count}d${sides}${modStr} → [${rolls.join(', ')}]${modifier ? ` ${modifier > 0 ? '+' : ''}${modifier}` : ''} = **${total}**`,
  };
}

export function isDiceCommand(input: string): boolean {
  return DICE_REGEX.test(input.trim());
}
