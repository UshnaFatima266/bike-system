import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>BikeX Parts</h3>
        </div>
        <div>
          <h4>Browse</h4>
          <Link to="/shop">Shop</Link>
          <Link to="/deals">Deals</Link>
          <Link to="/about">About us</Link>
        </div>
        <div>
          <h4>Support</h4>
          <Link to="/contact">Contact us</Link>
          <Link to="/account">My account</Link>
          <Link to="/login">Login</Link>
        </div>
        <div>
          <h4>Contact</h4>
          <p>BikeXparts@gmail.com</p>
          <p>Karachi, Pakistan</p>
          <p>Mon - Sat | 9AM - 7PM</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>BikeX Parts</p>
        <p>Spare parts for everyday riders and workshops.</p>
      </div>
    </footer>
  );
}

export default Footer;
