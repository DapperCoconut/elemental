export interface Recipe {
  ingredients: [string, string]; // element IDs, order-independent
  result: string;
  resultName: string;
  resultEmoji: string;
}

export const RECIPES: Recipe[] = [
  { ingredients: ['fire', 'water'], result: 'oil', resultName: 'Oil', resultEmoji: '🛢️' },
];

export function findRecipe(a: string, b: string): Recipe | undefined {
  return RECIPES.find(
    (r) =>
      (r.ingredients[0] === a && r.ingredients[1] === b) ||
      (r.ingredients[0] === b && r.ingredients[1] === a),
  );
}
