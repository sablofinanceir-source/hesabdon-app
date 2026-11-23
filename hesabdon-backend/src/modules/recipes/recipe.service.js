import { AppError } from '../../core/AppError.js';
import { round } from '../../core/math.js';
import { Product } from '../products/product.model.js';
import { Recipe } from './recipe.model.js';

export const getRecipeByProduct = (shopId, productId) => Recipe.findOne({ shop: shopId, product: productId }).lean();

const populate = [
  { path: 'product', select: 'name unit sellPrice' },
  { path: 'ingredients.product', select: 'name unit buyPrice stock' },
];

/** بهای تمام‌شده هر واحد از روی قیمت خرید مواد اولیه */
function costOf(recipe) {
  const total = recipe.ingredients.reduce((s, i) => s + (i.product?.buyPrice ?? 0) * i.quantity, 0);
  return round(total / recipe.yield, 2);
}

export async function computeRecipeCost(shopId, productId) {
  const recipe = await Recipe.findOne({ shop: shopId, product: productId }).populate('ingredients.product', 'buyPrice').lean();
  return recipe ? costOf(recipe) : null;
}

const present = (recipe) => {
  const cost = costOf(recipe);
  const sell = recipe.product?.sellPrice ?? 0;
  return { ...recipe, cost, profitPerUnit: round(sell - cost, 2) };
};

async function validateIngredients(shopId, productId, ingredients) {
  const ids = ingredients.map((i) => i.productId);
  if (ids.includes(String(productId))) throw AppError.unprocessable('کالا نمی‌تواند ماده اولیه خودش باشد');
  if (new Set(ids).size !== ids.length) throw AppError.unprocessable('ماده اولیه تکراری است');
  const found = await Product.find({ _id: { $in: ids }, shop: shopId, isActive: true }).select('hasRecipe').lean();
  if (found.length !== ids.length) throw AppError.notFound('یکی از مواد اولیه پیدا نشد', 'PRODUCT_NOT_FOUND');
  if (found.some((p) => p.hasRecipe)) throw AppError.unprocessable('ماده اولیه نمی‌تواند خودش دستور ساخت داشته باشد');
}

const toDocIngredients = (list) => list.map((i) => ({ product: i.productId, quantity: i.quantity }));

export async function listRecipes(shopId) {
  const recipes = await Recipe.find({ shop: shopId }).populate(populate).lean();
  return recipes.map(present);
}

export async function getRecipe(shopId, id) {
  const recipe = await Recipe.findOne({ _id: id, shop: shopId }).populate(populate).lean();
  if (!recipe) throw AppError.notFound('دستور ساخت پیدا نشد');
  return present(recipe);
}

export async function createRecipe(shopId, data) {
  const product = await Product.findOne({ _id: data.productId, shop: shopId, isActive: true });
  if (!product) throw AppError.notFound('کالا پیدا نشد', 'PRODUCT_NOT_FOUND');
  if (await Recipe.exists({ shop: shopId, product: product._id })) {
    throw AppError.conflict('برای این کالا قبلاً دستور ساخت ثبت شده است', 'RECIPE_EXISTS');
  }
  await validateIngredients(shopId, product._id, data.ingredients);

  const recipe = await Recipe.create({
    shop: shopId, product: product._id, ingredients: toDocIngredients(data.ingredients), yield: data.yield, note: data.note,
  });
  await Product.updateOne({ _id: product._id }, { hasRecipe: true });
  return getRecipe(shopId, recipe._id);
}

export async function updateRecipe(shopId, id, data) {
  const recipe = await Recipe.findOne({ _id: id, shop: shopId });
  if (!recipe) throw AppError.notFound('دستور ساخت پیدا نشد');
  if (data.ingredients) {
    await validateIngredients(shopId, recipe.product, data.ingredients);
    recipe.ingredients = toDocIngredients(data.ingredients);
  }
  if (data.yield !== undefined) recipe.yield = data.yield;
  if (data.note !== undefined) recipe.note = data.note;
  await recipe.save();
  return getRecipe(shopId, id);
}

export async function deleteRecipe(shopId, id) {
  const recipe = await Recipe.findOneAndDelete({ _id: id, shop: shopId });
  if (!recipe) throw AppError.notFound('دستور ساخت پیدا نشد');
  await Product.updateOne({ _id: recipe.product }, { hasRecipe: false });
  return { deleted: true };
}
