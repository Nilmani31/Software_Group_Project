"""
Bulk-adds every real item from the Bartender + Barista inventory sheets
into MongoDB via the existing POST /api/items/ endpoint, so the whole
real inventory can be tested with zero-shot search at once instead of
one-by-one through Postman.

Run: python add_real_items.py
Make sure the backend (port 5005) is running first.
"""

import requests

BACKEND_URL = "http://localhost:5005"

# Real category IDs from this project's Category collection
CAT_BAR_MATERIALS = "69873edabcce6b7af7e87332"
CAT_RAW_MATERIALS = "69873edabcce6b7af7e8732f"
CAT_CLEANING_SUPPLIES = "69873edabcce6b7af7e87334"
CAT_PACKAGING = "69873edabcce6b7af7e87335"

# name -> category, deduplicated across both sheets
ITEMS = {
	# --- Liquors (Bartender sheet) ---
	"Vodka": CAT_BAR_MATERIALS,
	"Red Wine": CAT_BAR_MATERIALS,
	"Sparkling Wine": CAT_BAR_MATERIALS,
	"Beer Tin": CAT_BAR_MATERIALS,
	"Beer Bottle": CAT_BAR_MATERIALS,
	"Whiskey": CAT_BAR_MATERIALS,
	"Amaretto": CAT_BAR_MATERIALS,
	"Arrack": CAT_BAR_MATERIALS,
	"Gin": CAT_BAR_MATERIALS,
	"Dry Martini": CAT_BAR_MATERIALS,
	"Coffee Liqueur (Kahlua)": CAT_BAR_MATERIALS,
	"Mint Liqueur": CAT_BAR_MATERIALS,
	"Cocoa Liqueur White": CAT_BAR_MATERIALS,
	"Brandy": CAT_BAR_MATERIALS,
	"Creme de Cacao": CAT_BAR_MATERIALS,
	"Bitters": CAT_BAR_MATERIALS,
	"Dark Rum": CAT_BAR_MATERIALS,
	"White Rum": CAT_BAR_MATERIALS,
	"Tequila": CAT_BAR_MATERIALS,
	"Absinthe": CAT_BAR_MATERIALS,
	"Bayleys": CAT_BAR_MATERIALS,
	"Banana Liqueur": CAT_BAR_MATERIALS,
	"Blue Curacao Liquor": CAT_BAR_MATERIALS,
	"Sambuca": CAT_BAR_MATERIALS,
	"Peach Liqueur": CAT_BAR_MATERIALS,
	"Sumersby Apple Beer": CAT_BAR_MATERIALS,
	"Jagermeister": CAT_BAR_MATERIALS,
	"Campari": CAT_BAR_MATERIALS,
	"Narikela": CAT_BAR_MATERIALS,
	"Coconut Cream": CAT_BAR_MATERIALS,
	"Martini Rosso": CAT_BAR_MATERIALS,
	"Triple Sec": CAT_BAR_MATERIALS,
	"Crame de Cassis": CAT_BAR_MATERIALS,
	"Galliano": CAT_BAR_MATERIALS,

	# --- Monin (appears on both sheets, added once) ---
	"Monin Mango Puree": CAT_RAW_MATERIALS,
	"Monin Passion Puree": CAT_RAW_MATERIALS,
	"Monin Strawberry Puree": CAT_RAW_MATERIALS,
	"Monin Blueberry Puree": CAT_RAW_MATERIALS,
	"Monin Peach Puree": CAT_RAW_MATERIALS,
	"Monin Vanilla Powder": CAT_RAW_MATERIALS,
	"Monin Sauce Caramel": CAT_RAW_MATERIALS,
	"Monin Sauce Dark Chocolate": CAT_RAW_MATERIALS,
	"Monin Sauce White Chocolate": CAT_RAW_MATERIALS,
	"Monin Syrup Caramel": CAT_RAW_MATERIALS,
	"Monin Syrup Chocolate": CAT_RAW_MATERIALS,
	"Monin Syrup Grenadine": CAT_RAW_MATERIALS,
	"Monin Syrup Hazelnut": CAT_RAW_MATERIALS,
	"Monin Syrup Vanilla": CAT_RAW_MATERIALS,
	"Monin Syrup Watermelon": CAT_RAW_MATERIALS,
	"Monin Syrup Peach": CAT_RAW_MATERIALS,
	"Monin Syrup Blue Curacao": CAT_RAW_MATERIALS,

	# --- Bartender sheet "Other" ---
	"Ginger Ale": CAT_BAR_MATERIALS,
	"Lemonade": CAT_BAR_MATERIALS,
	"Apple Cordial": CAT_BAR_MATERIALS,
	"Blackcurrant Cordial": CAT_BAR_MATERIALS,
	"Orange Nectar": CAT_BAR_MATERIALS,
	"Mango Nectar": CAT_BAR_MATERIALS,
	"Ride Energy Drink": CAT_BAR_MATERIALS,
	"Black Tea (Loose Leaf)": CAT_RAW_MATERIALS,
	"Soda": CAT_BAR_MATERIALS,
	"Nutmeg": CAT_RAW_MATERIALS,
	"Salt": CAT_RAW_MATERIALS,
	"Cinnamon Powder": CAT_RAW_MATERIALS,
	"Charcoal": CAT_BAR_MATERIALS,
	"Shisha Flavours": CAT_BAR_MATERIALS,
	"Brown Sugar": CAT_RAW_MATERIALS,
	"White Sugar": CAT_RAW_MATERIALS,
	"Ginger Beer": CAT_BAR_MATERIALS,
	"Coca Cola": CAT_BAR_MATERIALS,
	"Cherry": CAT_RAW_MATERIALS,
	"Olive Fruit": CAT_RAW_MATERIALS,
	"Wine Cork": CAT_BAR_MATERIALS,
	"Wine Foil": CAT_BAR_MATERIALS,
	"Cranberry Juice": CAT_BAR_MATERIALS,
	"Shisha Mouth Piece": CAT_BAR_MATERIALS,
	"Straw Packets": CAT_PACKAGING,

	# --- Barista sheet ---
	"Fresh Milk": CAT_RAW_MATERIALS,
	"Vanilla Ice Cream": CAT_RAW_MATERIALS,
	"Whipping Cream": CAT_RAW_MATERIALS,
	"Cream Chargers": CAT_RAW_MATERIALS,
	"Blue Liquids": CAT_RAW_MATERIALS,
	"Dish Wash": CAT_CLEANING_SUPPLIES,
	"Hand Wash": CAT_CLEANING_SUPPLIES,
	"Bill Rolls": CAT_PACKAGING,
	"Black Tea (Sachet)": CAT_RAW_MATERIALS,
	"Peach Tea": CAT_RAW_MATERIALS,
	"Moroccan and Mint Tea": CAT_RAW_MATERIALS,
	"Strawberry Tea": CAT_RAW_MATERIALS,
	"Hot Chocolate": CAT_RAW_MATERIALS,
	"Tissue Bundles": CAT_PACKAGING,

	# --- Barista sheet "Other" ---
	"Hand Gloves": CAT_CLEANING_SUPPLIES,
	"Straw": CAT_PACKAGING,
	"Sponge": CAT_CLEANING_SUPPLIES,
	"Milkmaid": CAT_RAW_MATERIALS,
}


def main():
	created, skipped, failed = 0, 0, 0

	for name, category in ITEMS.items():
		try:
			resp = requests.post(
				f"{BACKEND_URL}/api/items/",
				json={"name": name, "category": category},
				timeout=15,
			)
			if resp.status_code in (200, 201):
				print(f"✅ {name}")
				created += 1
			else:
				print(f"⚠️  {name} -> HTTP {resp.status_code}: {resp.text[:150]}")
				skipped += 1
		except Exception as exc:
			print(f"❌ {name} -> {exc}")
			failed += 1

	print(f"\nDone. Created/updated: {created}, skipped: {skipped}, failed: {failed}")


if __name__ == "__main__":
	main()