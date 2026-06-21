import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useShop } from "../store/ShopContext";

function ShopPage() {
  const { products, categories, brands, error } = useShop();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const categoryFromUrl = searchParams.get("category");
  const selectedCategory = categories.some((category) => category.id === categoryFromUrl) ? categoryFromUrl : "all";
  const selectedBrand = searchParams.get("brand") ?? "all";

  const updateParam = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);

    if (!value || value === "all") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    setSearchParams(nextParams);
  };

  const filteredProducts = products.filter((product) => {
    const normalizedSearch = search.toLowerCase().trim();
    const searchableText = [
      product.name,
      product.brand,
      product.description,
      product.categoryName,
      product.sku,
    ]
      .join(" ")
      .toLowerCase();
    const bySearch = !normalizedSearch || searchableText.includes(normalizedSearch);
    const byCategory = selectedCategory === "all" || product.category === selectedCategory;
    const byBrand = selectedBrand === "all" || product.brand === selectedBrand;
    return bySearch && byCategory && byBrand;
  });

  return (
    <section className="container page-stack page-pad">
      <div className="shop-hero">
        <div>
          <span className="eyebrow">Catalogue</span>
          <h1>Find the right part fast</h1>
          <p>
            Search by category, compare workshop-ready stock, and move from discovery to checkout
            without losing momentum.
          </p>
        </div>
        <div className="shop-hero-metrics">
          <div><strong>{products.length}</strong><span>Live products</span></div>
          <div><strong>{brands.length}</strong><span>Brands covered</span></div>
          <div><strong>{categories.length}</strong><span>Categories available</span></div>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <span className="eyebrow">Catalogue</span>
          <h2>Shop every bike system</h2>
        </div>
      </div>

      <div className="shop-layout">
        <aside className="filter-panel">
          <div className="filter-group">
            <label htmlFor="search">Search</label>
            <input id="search" value={search} onChange={(event) => updateParam("search", event.target.value)} placeholder="Brake pad, battery, chain..." />
          </div>

          <div className="filter-group">
            <label htmlFor="category">Category</label>
            <select id="category" value={selectedCategory} onChange={(event) => updateParam("category", event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="brand">Brand</label>
            <select id="brand" value={selectedBrand} onChange={(event) => updateParam("brand", event.target.value)}>
              <option value="all">All brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Popular systems</span>
            <div className="chip-grid">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`filter-chip${selectedCategory === category.id ? " active" : ""}`}
                  onClick={() => updateParam("category", category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="shop-results">
          <div className="results-summary">
            <p>{filteredProducts.length} products found</p>
            <Link to="/deals" className="ghost-link">View live offers</Link>
          </div>
          {error ? <p>{error}</p> : null}
          {filteredProducts.length ? (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state-card">
              <h3>No products match this filter</h3>
              <p>Try a different search term or reset the category and brand filters.</p>
              <button type="button" className="secondary-button" onClick={() => setSearchParams(new URLSearchParams())}>
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ShopPage;
