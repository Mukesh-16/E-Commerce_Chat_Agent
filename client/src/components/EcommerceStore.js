import { FaSearch, FaShoppingCart, FaUser, FaHeart } from 'react-icons/fa'
import ChatWidget from './ChatWidget'

const EcommerceStore = () => {
    return (
        <>
            <header className="header">
                <div className="container">
                    <div className="top-bar">
                        <div className="logo">ShopSmart</div>
                        <div className="search-bar">
                            <input type="text" placeholder="Search for products..." />
                            <button>
                                <FaSearch />
                            </button>
                        </div>

                        <div className="nav-icons">
                            <a href="#account">
                                <FaUser size={20} />
                            </a>
                            <a href="##wishList">
                                <FaHeart size={20} />
                                <span className="badge">{3}</span>
                            </a>
                            <a href="#cart">
                                <FaShoppingCart size={20} />
                                <span className="badge">{2}</span>
                            </a>
                        </div>
                    </div>
                    <nav className="nav-bar">
                        <ul>
                            <li><a href="/home" className="active">Home</a></li>
                            <li><a href="/electronics">Electronics</a></li>
                            <li><a href="/clothing">Clothing</a></li>
                            <li><a href="/kitchen">Kitchen</a></li>
                            <li><a href="/beauty">Beauty</a></li>
                            <li><a href="/sports">Sports</a></li>
                            <li><a href="/deals">Deals</a></li>
                        </ul>
                    </nav>
                </div>
            </header>

            <main>
                <div className="hero">
                    <div className="container">
                        <h1>Winter Sale is Ending Soon!</h1>
                        <p>Get up to 50% off on selected items. Limited time offer.</p>
                        <button>Shop Now</button>
                    </div>
                </div>
            </main>

            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-column">
                            <h4>Shop</h4>
                            <ul>
                                <li><a href="/electronics">Electronics</a></li>
                                <li><a href="/clothing">Clothing</a></li>
                                <li><a href="/kitchen">Kitchen</a></li>
                                <li><a href="/beauty">Beauty</a></li>
                                <li><a href="/sports">Sports</a></li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h4>Customer Service</h4>
                            <ul>
                                <li><a href="/contact-us">Contact Us</a></li>
                                <li><a href="/faqs">FAQs</a></li>
                                <li><a href="/shipping-policy">Shipping Policy</a></li>
                                <li><a href="/returns-exchanges">Returns & Exchanges</a></li>
                                <li><a href="/order-tracking">Order Tracking</a></li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h4>About Us</h4>
                            <ul>
                                <li><a href="/our-story">Our Story</a></li>
                                <li><a href="/blog">Blog</a></li>
                                <li><a href="/careers">Careers</a></li>
                                <li><a href="/press">Press</a></li>
                                <li><a href="/sustainability">Sustainability</a></li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h4>Connect with Us</h4>
                            <ul>
                                <li><a href="/facebook">Facebook</a></li>
                                <li><a href="/twitter">Twitter</a></li>
                                <li><a href="/instagram">Instagram</a></li>
                                <li><a href="/pinterest">Pinterest</a></li>
                                <li><a href="/youtube">Youtube</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="copyright">
                        &copy; {new Date().getFullYear()} ShopSmart. All rights reserved.
                    </div>
                </div>
            </footer>

            <ChatWidget />
        </>
    )
}

export default EcommerceStore;