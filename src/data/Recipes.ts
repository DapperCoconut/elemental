export interface Recipe {
  ingredients: [string, string]; // element IDs, order-independent
  result: string;
  resultName: string;
  resultEmoji: string;
}

export const RECIPES: Recipe[] = [
  { ingredients: ['fire', 'water'], result: 'oil',    resultName: 'Oil',    resultEmoji: '🛢️' },
  { ingredients: ['fire', 'air'],   result: 'shadow', resultName: 'Shadow', resultEmoji: '🌑' },
  { ingredients: ['water', 'air'],  result: 'ice',    resultName: 'Ice',    resultEmoji: '🧊' },
  { ingredients: ['water', 'life'],  result: 'growth',  resultName: 'Growth',  resultEmoji: '🦠' },
  { ingredients: ['water', 'earth'], result: 'crystal', resultName: 'Crystal', resultEmoji: '💎' },
  { ingredients: ['life', 'air'],   result: 'soul',    resultName: 'Soul',    resultEmoji: '👻' },
  { ingredients: ['life', 'fire'],  result: 'hunt',    resultName: 'Hunt',    resultEmoji: '🐺' },
  { ingredients: ['earth', 'air'], result: 'sand',    resultName: 'Time',    resultEmoji: '⏳' },
];

export function findRecipe(a: string, b: string): Recipe | undefined {
  return RECIPES.find(
    (r) =>
      (r.ingredients[0] === a && r.ingredients[1] === b) ||
      (r.ingredients[0] === b && r.ingredients[1] === a),
  );
}
