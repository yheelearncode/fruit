import heroImage from './assets/hero.png';
import './App.css';

const productPrice = 33440;
const deliveryFee = 2500;
const totalPrice = productPrice + deliveryFee;

const formatPrice = (price: number) => `${price.toLocaleString('ko-KR')} KRW`;

function Field({
  label,
  required,
  placeholder,
  wide,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span>
        {label}
        {required && <em>*</em>}
      </span>
      <input type="text" placeholder={placeholder} />
    </label>
  );
}

function BenefitRail() {
  return (
    <aside className="benefit-rail" aria-label="Checkout benefits">
      <div className="benefit-card member">
        <strong>CLUB</strong>
        <span>Member checkout</span>
        <b>+1,000</b>
        <span>reward points</span>
      </div>
      <div className="benefit-card welcome">
        <strong>FIRST</strong>
        <span>New customer</span>
        <b>3,000</b>
        <span>bonus coupon</span>
      </div>
    </aside>
  );
}

function App() {
  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <p>SEJIN STORE</p>
        <h1>Secure Checkout</h1>
        <span className="cart-count">0</span>
      </header>

      <main className="checkout-layout">
        <div className="checkout-main">
          <section className="product-summary" aria-labelledby="product-title">
            <div className="product-left">
              <div className="product-image">
                <img src={heroImage} alt="Product package preview" />
              </div>
              <button className="cart-button" type="button">
                Save to Cart
              </button>
            </div>

            <div className="product-info">
              <p className="product-subtitle">Fresh dessert collection</p>
              <h2 id="product-title">Berry Cream Dessert Box</h2>
              <div className="price-line">
                <span className="discount">12%</span>
                <strong>{formatPrice(productPrice)}</strong>
                <del>38,000 KRW</del>
              </div>

              <dl className="product-meta">
                <div>
                  <dt>Origin</dt>
                  <dd>Korea</dd>
                </div>
                <div>
                  <dt>Maker</dt>
                  <dd>Sejin Bakery Lab</dd>
                </div>
                <div>
                  <dt>Series</dt>
                  <dd>Daily Treat</dd>
                </div>
                <div>
                  <dt>Bundle deal</dt>
                  <dd>
                    <label className="radio-line">
                      <input type="radio" name="bulk" />
                      2,000 KRW off when buying 2 or more
                    </label>
                    <small>Applies after required options are selected.</small>
                  </dd>
                </div>
              </dl>

              <dl className="delivery-meta">
                <div>
                  <dt>Delivery</dt>
                  <dd>
                    <strong>{formatPrice(deliveryFee)}</strong>
                    <small>Free shipping over 50,000 KRW.</small>
                    <small>Remote area fees may be added after address check.</small>
                  </dd>
                </div>
              </dl>

              <div className="option-block">
                <p>
                  Required option <em>*</em>
                </p>
                <button type="button">Choose size</button>
              </div>

              <div className="option-block">
                <p>Add-ons</p>
                <button type="button">Gift wrapping</button>
                <button type="button">Message card</button>
              </div>

              <div className="mini-total">
                <div>
                  <strong>Estimated total</strong>
                  <b>{formatPrice(totalPrice)}</b>
                </div>
                <dl>
                  <div>
                    <dt>Items</dt>
                    <dd>{formatPrice(productPrice)}</dd>
                  </div>
                  <div>
                    <dt>Delivery</dt>
                    <dd>{formatPrice(deliveryFee)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="form-section" aria-labelledby="buyer-title">
            <div className="section-title">
              <h2 id="buyer-title">Buyer Details</h2>
              <a href="#join">Create account</a>
            </div>
            <div className="form-table">
              <Field label="Name" required placeholder="Full name" />
              <label className="field">
                <span>
                  Customs ID <em>*</em>
                </span>
                <div>
                  <input type="text" placeholder="Personal customs code" />
                  <p className="error-text">
                    The name, phone number, and address must match the customs ID.
                  </p>
                  <button className="small-button" type="button">
                    Check customs ID
                  </button>
                </div>
              </label>
              <Field label="Mobile" required placeholder="010-0000-0000" />
              <Field label="Email" required placeholder="name@example.com" />
            </div>
          </section>

          <section className="form-section" aria-labelledby="receiver-title">
            <div className="section-title">
              <h2 id="receiver-title">Recipient Details</h2>
              <label className="same-check">
                <input type="checkbox" />
                Same as buyer
              </label>
            </div>
            <div className="form-table">
              <Field label="Recipient" required placeholder="Full name" />
              <Field label="Mobile" required placeholder="010-0000-0000" />
              <Field label="Alt. phone" placeholder="Optional phone number" />
              <label className="field field-wide">
                <span>
                  Address <em>*</em>
                </span>
                <div className="address-fields">
                  <div className="zip-row">
                    <input type="text" placeholder="Postal code" readOnly />
                    <button type="button">Search</button>
                  </div>
                  <input type="text" placeholder="Address line 1" readOnly />
                  <input type="text" placeholder="Address line 2" />
                </div>
              </label>
              <Field label="Delivery note" placeholder="Leave delivery instructions" wide />
            </div>
          </section>

          <section className="payment-section" aria-labelledby="payment-title">
            <h2 id="payment-title">Payment Summary</h2>
            <dl className="payment-total">
              <div>
                <dt>Items</dt>
                <dd>{formatPrice(productPrice)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>+ {formatPrice(deliveryFee)}</dd>
              </div>
              <div>
                <dt>Bundle discount</dt>
                <dd>- 0 KRW</dd>
              </div>
              <div className="grand-total">
                <dt>Total due</dt>
                <dd>{formatPrice(totalPrice)}</dd>
              </div>
            </dl>
          </section>

          <section className="payment-methods" aria-labelledby="method-title">
            <h2 id="method-title">Payment Method</h2>
            <div className="method-grid">
              <button className="selected" type="button">
                Card
              </button>
              <button type="button">Mobile Pay</button>
              <button type="button">Bank Transfer</button>
              <button type="button">Virtual Account</button>
              <button type="button">Manual Approval</button>
            </div>
            <p className="payment-note">
              - Card benefits and installment options may vary by issuer.
              <br />- Saved payment methods are processed by the selected payment provider.
            </p>
          </section>

          <section className="agreement-section" aria-labelledby="agreement-title">
            <h2 id="agreement-title">Required Agreements</h2>
            <div className="agreement-list">
              <div>
                <span>
                  Guest order privacy consent <em>*</em>
                </span>
                <button type="button">View</button>
              </div>
              <div>
                <span>
                  Privacy policy consent <em>*</em>
                </span>
                <button type="button">View</button>
              </div>
              <div>
                <span>
                  Terms of service consent <em>*</em>
                </span>
                <button type="button">View</button>
              </div>
            </div>
          </section>

          <button className="pay-button" type="button">
            Place Order
          </button>
        </div>

        <BenefitRail />
      </main>

      <button className="talk-button" aria-label="Open support chat" type="button">
        HELP
      </button>

      <footer className="checkout-footer">
        <span />
        Product, delivery, exchange, and refund responsibility belongs to the seller.
      </footer>
    </div>
  );
}

export default App;
