import ProductCard from "../components/ProductCard";
import { useShop } from "../store/ShopContext";

function DealsPage() {
  const { dealProducts } = useShop();

  return (
    <section className="container page-stack page-pad">
      <div className="deals-hero">
        <div>
          <span className="eyebrow">Deals</span>
          <h1>Current product offers</h1>
          <p>Explore discounted products and limited-time offers here.</p>
        </div>
        <div className="deal-highlight">
          <small>Featured offer</small>
          <strong>{dealProducts.length ? `${dealProducts[0].discountPercent}% off` : "No active deals"}</strong>
          <span>{dealProducts.length ? dealProducts[0].name : "Check back soon for the next offer."}</span>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <span className="eyebrow">Deals</span>
          <h2>Live offers</h2>
        </div>
      </div>

      {dealProducts.length ? (
        <>
          <div className="deals-strip">
            {dealProducts.slice(0, 2).map((product, index) => (
              <article key={product.id} className={`deal-card ${index === 0 ? "navy" : "light"}`}>
                <span>{product.dealTitle || "Admin special"}</span>
                <h3>{product.name}</h3>
                <p>Save {product.discountPercent}% on this live campaign while stock lasts.</p>
              </article>
            ))}
          </div>

          <div className="product-grid">
            {dealProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state-card">
          <h3>No active deals right now</h3>
          <p>Check back soon for the next set of offers.</p>
        </div>
      )}
    </section>
  );
}

export default DealsPage;
