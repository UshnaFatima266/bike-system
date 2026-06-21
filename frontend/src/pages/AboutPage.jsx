function AboutPage() {
  return (
    <section className="container page-stack page-pad">
      <div className="account-hero">
        <div>
          <span className="eyebrow">About Us</span>
          <h1>Our goal</h1>
          <p>BikeX Parts started with one goal: make it easier for customers to find trusted spare parts without dealing with confusing catalogues and outdated store layouts.</p>
        </div>
        <div className="account-badge-card">
          <small>What we focus on</small>
          <strong>Quality parts and a better buying experience</strong>
          <span>Clear categories, useful product pages, and a cleaner journey from shop to order.</span>
        </div>
      </div>

      <div className="account-detail-grid">
        <article className="panel-card">
          <h3>Trusted catalogue</h3>
          <p>We focus on the parts customers actually need, presented in a simpler and cleaner way.</p>
        </article>
        <article className="panel-card">
          <h3>Useful shopping flow</h3>
          <p>From browsing to checkout, the goal is to help customers move quickly and confidently.</p>
        </article>
        <article className="panel-card">
          <h3>Growing selection</h3>
          <p>The store continues to expand with more categories, better deals, and stronger product organization.</p>
        </article>
        <article className="panel-card">
          <h3>Customer first</h3>
          <p>We keep the experience focused on what helps customers most: products, deals, contact, and account support.</p>
        </article>
      </div>
    </section>
  );
}

export default AboutPage;
