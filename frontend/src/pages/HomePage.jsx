import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useShop } from "../store/ShopContext";

const heroCards = [
  {
    title: "Heavy Bike",
    subtitle: "Road king look",
    text: "Muscular styling for riders who want a bolder machine on the road.",
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "CD 70",
    subtitle: "Daily commuter",
    text: "Simple, practical, and built for long everyday runs across the city.",
    image: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Sport Bike",
    subtitle: "Weekend machine",
    text: "Sharper body lines and a faster visual edge for performance-focused riders.",
    image: "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Yamaha VMAX",
    subtitle: "Pure muscle, unleashed.",
    text: "Everything feels normal… until you twist the throttle.",
    image: "data:image/jpeg;base64,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",
  },
];

const heroLeadImage = heroCards[0].image;

function HomePage() {
  const { products, categories, bestSellerProducts, dealProducts } = useShop();
  const featuredDeals = dealProducts.slice(0, 3);
  const categoryDescriptions = {
    Bikes: "Fast-moving bike parts for daily riders, workshops, and routine service jobs.",
    Car: "Useful car essentials for regular maintenance, replacements, and cleaner driving support.",
    "General Parts": "Flexible spare parts for mixed repair needs and quick replacement work.",
  };

  return (
    <div className="page-stack">
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Quality Spare Parts</span>
            <img className="hero-lead-image" src={heroLeadImage} alt="Featured heavy bike" />
            <div className="hero-copy-text">
              <h1>Buy trusted bike faster.</h1>
              <p>
                Explore reliable parts, live offers, and much more.
              </p>
              <div className="hero-actions">
                <Link to="/shop" className="primary-button">
                  Shop inventory
                </Link>
                <Link to="/deals" className="secondary-button light">
                  View live deals
                </Link>
              </div>
              <div className="hero-stats">
                <div>
                  <strong>{products.length || "0"}</strong>
                  <span>Parts in stock</span>
                </div>
                <div>
                  <strong>{bestSellerProducts.slice(0, 6).length || "0"}</strong>
                  <span>Best seller picks</span>
                </div>
                <div>
                  <strong>{featuredDeals.length || "0"}</strong>
                  <span>Current deals</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-stack-board">
              {heroCards.map((card, index) => (
                <article key={card.title} className={`hero-stack-card hero-stack-${index + 1}`}>
                  <img className="stack-card-image" src={card.image} alt={card.title} />
                  <div className="stack-card-copy">
                    <small>{card.subtitle}</small>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Categories</span>
            <h2>Shop by category</h2>
          </div>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link className="category-card" key={category.id} to={`/shop?category=${category.id}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{category.name}</strong>
              <p>
                {categoryDescriptions[category.name] ||
                  "Explore reliable parts selected for this category."}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section feature-band">
        <div className="feature-band-copy">
          <span className="eyebrow">Current offers</span>
          <h2>Save more on selected products.</h2>
        </div>
        {featuredDeals.length ? (
          <div className="feature-band-grid">
            {featuredDeals.map((product) => (
              <article key={product.id} className="feature-band-card">
                <span className="eyebrow">-{product.discountPercent}% OFF</span>
                <h3>{product.name}</h3>
                <p>{product.dealTitle || "Live offer available for a limited time."}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <h3>No active deals right now</h3>
            <p>Check back soon for new offers on selected products.</p>
          </div>
        )}
      </section>

      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Featured products</span>
            <h2>Best sellers this week</h2>
          </div>
          <Link to="/shop" className="ghost-link">
            See all products
          </Link>
        </div>
        <div className="product-grid">
          {bestSellerProducts.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
