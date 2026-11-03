/**
 * FinMax Statement Parser — Rule-Based Category Classifier
 *
 * This is a transparent keyword/merchant rule engine.
 * No ML model is used. No fake confidence percentages.
 * Category source is labelled 'auto' (rule-matched) or 'manual' (user-set).
 */

import type { FinMaxCategory } from './types';

interface CategoryRule {
  patterns: string[];
  category: FinMaxCategory;
}

const RULES: CategoryRule[] = [
  {
    patterns: [
      'swiggy', 'zomato', 'restaurant', 'cafe', 'mcdonald', 'mcdonalds',
      'pizza', 'food', 'dining', 'dominos', 'kfc', 'burger', 'subway',
      'dunkin', 'starbucks', 'eat', 'meal', 'lunch', 'dinner', 'breakfast',
      'biryani', 'kitchen', 'bakery', 'dhaba', 'canteen', 'barbeque',
      'chicken', 'tea', 'coffee', 'snack', 'takeaway',
      'sweet', 'sweets', 'e-sweets', 'mithai', 'confectionery', 'dessert',
    ],
    category: 'Food & Dining',
  },
  {
    patterns: [
      'uber', 'ola', 'rapido', 'metro', 'fuel', 'petrol', 'diesel',
      'parking', 'cab', 'bus', 'auto', 'taxi', 'transport', 'flight',
      'railway', 'irctc', 'indigo', 'spicejet', 'airasia', 'vistara',
      'toll', 'fastag', 'travel',
    ],
    category: 'Transportation',
  },
  {
    patterns: [
      'netflix', 'spotify', 'hotstar', 'prime', 'youtube', 'movie',
      'game', 'cinema', 'pvr', 'inox', 'bookmyshow', 'entertainment',
      'disney', 'zee5', 'sonyliv', 'apple music', 'gaana', 'jio cinema',
    ],
    category: 'Entertainment',
  },
  {
    patterns: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'mart',
      'store', 'mall', 'meesho', 'nykaa', 'tata cliq', 'snapdeal',
      'reliance digital', 'croma', 'jiomart', 'blinkit', 'zepto',
      'bigbasket', 'grofers', 'dmart', 'supermarket', 'hypermarket',
      'market', 'grocery', 'groceries',
    ],
    category: 'Shopping',
  },
  {
    patterns: [
      'electricity', 'water', 'gas', 'broadband', 'mobile', 'phone',
      'insurance', 'emi', 'loan', 'rent', 'wifi', 'dth', 'recharge',
      'bill', 'utility', 'bsnl', 'airtel', 'jio', 'vodafone', 'vi',
      'tata power', 'mseb', 'bescom', 'tangedco', 'subscription',
    ],
    category: 'Bills',
  },
  {
    patterns: [
      'hospital', 'pharmacy', 'medicine', 'doctor', 'clinic', 'health',
      'dental', 'medical', 'apollo', 'fortis', 'max hospital', 'netmeds',
      'pharmeasy', '1mg', 'medplus', 'diagnostics', 'lab', 'pathology',
      'optician', 'spectacles', 'therapy', 'supplement', 'wellness',
    ],
    category: 'Healthcare',
  },
];

/**
 * Classifies a transaction description into a FinMax category.
 * Returns 'Other' if no rule matches.
 */
export function classifyDescription(description: string): {
  category: FinMaxCategory;
  matched: boolean;
} {
  const normalized = description.toLowerCase().trim();

  for (const rule of RULES) {
    if (rule.patterns.some(p => normalized.includes(p))) {
      return { category: rule.category, matched: true };
    }
  }

  return { category: 'Other', matched: false };
}
