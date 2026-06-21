function ContactPage() {
  return (
    <section className="container page-stack page-pad">
      <div className="account-hero">
        <div>
          <span className="eyebrow">Contact Us</span>
          <h1>Get in touch for parts support, workshop needs, or order help</h1>
          <p>Use the contact details below to reach the store team for fitment questions, order support, or business enquiries.</p>
        </div>
        <div className="account-badge-card">
          <small>Support desk</small>
          <strong>Mon-Sat | 9 AM - 7 PM</strong>
          <span>Phone, email, and workshop order support in one place.</span>
        </div>
      </div>

      <div className="account-detail-grid">
        <article className="panel-card">
          <h3>Support channels</h3>
          <div className="list-stack">
            <div className="bike-tile"><strong>Email</strong><p>BikeXparts@gmail.com</p></div>
            <div className="bike-tile"><strong>Phone</strong><p>+92 300 1234567</p></div>
            <div className="bike-tile"><strong>Address</strong><p>Main market workshop lane, Karachi, Pakistan</p></div>
            <div className="bike-tile"><strong>Hours</strong><p>Monday to Saturday, 9 AM to 7 PM.</p></div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default ContactPage;
