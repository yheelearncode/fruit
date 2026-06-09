import { useEffect, useMemo, useState } from 'react';
import heroImage from './assets/hero.png';
import './App.css';

type Product = {
  id: string;
  name: string;
  subtitle: string;
  origin: string;
  maker: string;
  series: string;
  price: number;
  original_price: number;
  discount_rate: number;
  delivery_fee: number;
  free_delivery_minimum: number;
  options: {
    sizes: string[];
    add_ons: string[];
  };
};

type Buyer = {
  name: string;
  customs_id: string;
  mobile: string;
  email: string;
};

type Recipient = {
  name: string;
  mobile: string;
  alt_phone: string;
  postal_code: string;
  address1: string;
  address2: string;
  delivery_note: string;
};

const fallbackProduct: Product = {
  id: 'berry-cream-dessert-box',
  name: '베리 크림 디저트 박스',
  subtitle: '당일 포장 프레시 디저트 컬렉션',
  origin: 'Korea',
  maker: '세진 베이커리 랩',
  series: '데일리 트릿',
  price: 33440,
  original_price: 38000,
  discount_rate: 12,
  delivery_fee: 2500,
  free_delivery_minimum: 50000,
  options: {
    sizes: ['Small', 'Regular', 'Large'],
    add_ons: ['Gift wrapping', 'Message card'],
  },
};

const initialBuyer: Buyer = {
  name: '',
  customs_id: '',
  mobile: '',
  email: '',
};

const initialRecipient: Recipient = {
  name: '',
  mobile: '',
  alt_phone: '',
  postal_code: '',
  address1: '',
  address2: '',
  delivery_note: '',
};

const formatPrice = (price: number) => `${price.toLocaleString('ko-KR')}원`;

const sizeLabels: Record<string, string> = {
  Small: '소형',
  Regular: '기본',
  Large: '대형',
};

const addOnLabels: Record<string, string> = {
  'Gift wrapping': '선물 포장',
  'Message card': '메시지 카드',
};

const productTextLabels: Record<string, string> = {
  Korea: '국내산',
  'Fresh dessert collection': '당일 포장 프레시 디저트 컬렉션',
  'Berry Cream Dessert Box': '베리 크림 디저트 박스',
  'Sejin Bakery Lab': '세진 베이커리 랩',
  'Daily Treat': '데일리 트릿',
};

const localizeText = (value: string) => productTextLabels[value] ?? value;

function TextField({
  label,
  required,
  placeholder,
  value,
  onChange,
  type = 'text',
  wide,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span>
        {label}
        {required && <em>*</em>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function App() {
  const [product, setProduct] = useState<Product>(fallbackProduct);
  const [productState, setProductState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState(fallbackProduct.options.sizes[1]);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [buyer, setBuyer] = useState<Buyer>(initialBuyer);
  const [recipient, setRecipient] = useState<Recipient>(initialRecipient);
  const [sameAsBuyer, setSameAsBuyer] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [agreements, setAgreements] = useState({
    guest_privacy: false,
    privacy_policy: false,
    terms_of_service: false,
  });
  const [orderStatus, setOrderStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [orderMessage, setOrderMessage] = useState('');

  useEffect(() => {
    fetch('/api/products/berry-cream-dessert-box')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Product request failed');
        }
        return response.json();
      })
      .then((data: Product) => {
        setProduct(data);
        setSize(data.options.sizes[1] ?? data.options.sizes[0]);
        setProductState('ready');
      })
      .catch(() => {
        setProductState('offline');
      });
  }, []);

  const itemTotal = product.price * quantity;
  const deliveryFee = itemTotal >= product.free_delivery_minimum ? 0 : product.delivery_fee;
  const discount = quantity >= 2 ? 2000 : 0;
  const totalPrice = itemTotal + deliveryFee - discount;

  const orderReady = useMemo(
    () =>
      Boolean(
        buyer.name &&
          buyer.customs_id &&
          buyer.mobile &&
          buyer.email &&
          recipient.name &&
          recipient.mobile &&
          recipient.postal_code &&
          recipient.address1 &&
          size &&
          agreements.guest_privacy &&
          agreements.privacy_policy &&
          agreements.terms_of_service,
      ),
    [agreements, buyer, recipient, size],
  );

  const updateBuyer = (key: keyof Buyer, value: string) => {
    setBuyer((current) => ({ ...current, [key]: value }));

    if (sameAsBuyer && (key === 'name' || key === 'mobile')) {
      setRecipient((current) => ({ ...current, [key]: value }));
    }
  };

  const updateRecipient = (key: keyof Recipient, value: string) => {
    setRecipient((current) => ({ ...current, [key]: value }));
  };

  const toggleAddOn = (addOn: string) => {
    setAddOns((current) =>
      current.includes(addOn) ? current.filter((item) => item !== addOn) : [...current, addOn],
    );
  };

  const placeOrder = async () => {
    setOrderStatus('saving');
    setOrderMessage('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyer,
          recipient,
          items: [
            {
              product_id: product.id,
              quantity,
              size,
              add_ons: addOns,
            },
          ],
          payment_method: paymentMethod,
          agreements,
        }),
      });

      if (!response.ok) {
        throw new Error('Order request failed');
      }

      const order = await response.json();
      setOrderStatus('done');
      setOrderMessage(`주문이 접수되었습니다. 주문번호: ${order.id}`);
    } catch {
      setOrderStatus('error');
      setOrderMessage('주문 저장에 실패했습니다. 백엔드와 DB 연결 상태를 확인해 주세요.');
    }
  };

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <div>
          <p>SEJIN STORE</p>
          <h1>주문서 작성</h1>
        </div>
        <span className={`api-pill ${productState}`}>{productState === 'ready' ? 'DB' : 'LOCAL'}</span>
      </header>

      <main className="checkout-layout">
        <div className="checkout-main">
          <section className="product-summary" aria-labelledby="product-title">
            <div className="product-left">
              <div className="product-image">
                <img src={heroImage} alt="Product package preview" />
              </div>
              <div className="delivery-strip">
                <strong>신선 포장</strong>
                <span>결제 확인 후 순차 발송</span>
              </div>
            </div>

            <div className="product-info">
              <p className="product-subtitle">{localizeText(product.subtitle)}</p>
              <h2 id="product-title">{localizeText(product.name)}</h2>
              <div className="price-line">
                <span className="discount">{product.discount_rate}%</span>
                <strong>{formatPrice(product.price)}</strong>
                <del>{formatPrice(product.original_price)}</del>
              </div>

              <dl className="product-meta">
                <div>
                  <dt>원산지</dt>
                  <dd>{localizeText(product.origin)}</dd>
                </div>
                <div>
                  <dt>제조사</dt>
                  <dd>{localizeText(product.maker)}</dd>
                </div>
                <div>
                  <dt>상품군</dt>
                  <dd>{localizeText(product.series)}</dd>
                </div>
                <div>
                  <dt>혜택</dt>
                  <dd>2개 이상 구매 시 2,000원 할인</dd>
                </div>
              </dl>

              <div className="option-block">
                <p>
                  사이즈 <em>*</em>
                </p>
                <div className="segmented-control">
                  {product.options.sizes.map((option) => (
                    <button
                      className={option === size ? 'selected' : ''}
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                    >
                      {sizeLabels[option] ?? option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-block">
                <p>추가 옵션</p>
                <div className="addon-row">
                  {product.options.add_ons.map((addOn) => (
                    <label className="check-chip" key={addOn}>
                      <input
                        type="checkbox"
                        checked={addOns.includes(addOn)}
                        onChange={() => toggleAddOn(addOn)}
                      />
                      {addOnLabels[addOn] ?? addOn}
                    </label>
                  ))}
                </div>
              </div>

              <div className="quantity-row">
                <span>수량</span>
                <div className="stepper">
                  <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                    -
                  </button>
                  <b>{quantity}</b>
                  <button type="button" onClick={() => setQuantity((value) => Math.min(20, value + 1))}>
                    +
                  </button>
                </div>
              </div>

              <div className="mini-total">
                <div>
                  <strong>예상 결제금액</strong>
                  <b>{formatPrice(totalPrice)}</b>
                </div>
                <dl>
                  <div>
                    <dt>상품금액</dt>
                    <dd>{formatPrice(itemTotal)}</dd>
                  </div>
                  <div>
                    <dt>배송비</dt>
                    <dd>{deliveryFee === 0 ? '무료' : formatPrice(deliveryFee)}</dd>
                  </div>
                  <div>
                    <dt>묶음 할인</dt>
                    <dd>- {formatPrice(discount)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="form-section" aria-labelledby="buyer-title">
            <div className="section-title">
              <h2 id="buyer-title">주문자 정보</h2>
            </div>
            <div className="form-table">
              <TextField label="이름" required placeholder="홍길동" value={buyer.name} onChange={(value) => updateBuyer('name', value)} />
              <TextField
                label="개인통관고유부호"
                required
                placeholder="P123456789012"
                value={buyer.customs_id}
                onChange={(value) => updateBuyer('customs_id', value.toUpperCase())}
              />
              <TextField label="휴대폰" required placeholder="010-0000-0000" value={buyer.mobile} onChange={(value) => updateBuyer('mobile', value)} />
              <TextField label="이메일" required placeholder="name@example.com" value={buyer.email} onChange={(value) => updateBuyer('email', value)} type="email" />
            </div>
          </section>

          <section className="form-section" aria-labelledby="receiver-title">
            <div className="section-title">
              <h2 id="receiver-title">배송지 정보</h2>
              <label className="same-check">
                <input
                  type="checkbox"
                  checked={sameAsBuyer}
                  onChange={(event) => {
                    setSameAsBuyer(event.target.checked);
                    if (event.target.checked) {
                      setRecipient((current) => ({
                        ...current,
                        name: buyer.name,
                        mobile: buyer.mobile,
                      }));
                    }
                  }}
                />
                주문자와 동일
              </label>
            </div>
            <div className="form-table">
              <TextField label="받는 분" required placeholder="홍길동" value={recipient.name} onChange={(value) => updateRecipient('name', value)} />
              <TextField label="휴대폰" required placeholder="010-0000-0000" value={recipient.mobile} onChange={(value) => updateRecipient('mobile', value)} />
              <TextField label="추가 연락처" placeholder="선택 입력" value={recipient.alt_phone} onChange={(value) => updateRecipient('alt_phone', value)} />
              <label className="field field-wide">
                <span>
                  주소 <em>*</em>
                </span>
                <div className="address-fields">
                  <div className="zip-row">
                    <input
                      type="text"
                      placeholder="우편번호"
                      value={recipient.postal_code}
                      onChange={(event) => updateRecipient('postal_code', event.target.value)}
                    />
                    <button type="button" onClick={() => updateRecipient('postal_code', '06236')}>
                      주소 검색
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="기본주소"
                    value={recipient.address1}
                    onChange={(event) => updateRecipient('address1', event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="상세주소"
                    value={recipient.address2}
                    onChange={(event) => updateRecipient('address2', event.target.value)}
                  />
                </div>
              </label>
              <TextField
                label="배송 요청사항"
                placeholder="예: 문 앞에 놓아주세요"
                value={recipient.delivery_note}
                onChange={(value) => updateRecipient('delivery_note', value)}
                wide
              />
            </div>
          </section>

          <section className="payment-methods" aria-labelledby="method-title">
            <h2 id="method-title">결제수단</h2>
            <div className="method-grid">
              {['Card', 'Mobile Pay', 'Bank Transfer', 'Virtual Account', 'Manual Approval'].map((method) => (
                <button
                  className={paymentMethod === method ? 'selected' : ''}
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                >
                  {{
                    Card: '신용/체크카드',
                    'Mobile Pay': '간편결제',
                    'Bank Transfer': '계좌이체',
                    'Virtual Account': '가상계좌',
                    'Manual Approval': '수동 승인',
                  }[method]}
                </button>
              ))}
            </div>
          </section>

          <section className="agreement-section" aria-labelledby="agreement-title">
            <h2 id="agreement-title">필수 약관 동의</h2>
            <div className="agreement-list">
              {[
                ['guest_privacy', '비회원 주문 개인정보 수집 및 이용 동의'],
                ['privacy_policy', '개인정보 처리방침 동의'],
                ['terms_of_service', '이용약관 동의'],
              ].map(([key, label]) => (
                <label className="agreement-line" key={key}>
                  <span>
                    {label} <em>*</em>
                  </span>
                  <input
                    type="checkbox"
                    checked={agreements[key as keyof typeof agreements]}
                    onChange={(event) =>
                      setAgreements((current) => ({ ...current, [key]: event.target.checked }))
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <button
            className="pay-button"
            type="button"
            disabled={!orderReady || orderStatus === 'saving'}
            onClick={placeOrder}
          >
            {orderStatus === 'saving' ? '주문 저장 중...' : `주문하기 · ${formatPrice(totalPrice)}`}
          </button>
          {orderMessage && <p className={`order-message ${orderStatus}`}>{orderMessage}</p>}
        </div>

        <aside className="order-panel" aria-label="Order summary">
          <div>
            <span>결제 예정금액</span>
            <strong>{formatPrice(totalPrice)}</strong>
          </div>
          <dl>
            <div>
              <dt>상품</dt>
              <dd>{quantity}개</dd>
            </div>
            <div>
              <dt>배송비</dt>
              <dd>{deliveryFee === 0 ? '무료' : formatPrice(deliveryFee)}</dd>
            </div>
            <div>
              <dt>상품정보</dt>
              <dd>{productState === 'ready' ? 'DB 연동' : '로컬 미리보기'}</dd>
            </div>
          </dl>
        </aside>
      </main>

      <footer className="checkout-footer">
        <span />
        상품, 배송, 교환 및 환불 책임은 판매자에게 있습니다.
      </footer>
    </div>
  );
}

export default App;
