import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
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

type Totals = {
  items: number;
  delivery: number;
  discount: number;
  total: number;
};

type FormState = {
  buyerName: string;
  customsId: string;
  buyerMobile: string;
  buyerEmail: string;
  recipientName: string;
  recipientMobile: string;
  altPhone: string;
  postalCode: string;
  address1: string;
  address2: string;
  deliveryNote: string;
};

type Agreements = {
  guestPrivacy: boolean;
  privacyPolicy: boolean;
  termsOfService: boolean;
};

const productId = 'berry-cream-dessert-box';
const paymentMethods = ['카드 결제', '간편 결제', '무통장 입금', '가상 계좌', '수기 승인'] as const;
const paymentApiMap = {
  '카드 결제': 'Card',
  '간편 결제': 'Mobile Pay',
  '무통장 입금': 'Bank Transfer',
  '가상 계좌': 'Virtual Account',
  '수기 승인': 'Manual Approval',
} as const;

const defaultProduct: Product = {
  id: productId,
  name: '베리 크림 디저트 박스',
  subtitle: '오늘 만든 프레시 디저트 컬렉션',
  origin: '대한민국',
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

const sizeLabels: Record<string, string> = {
  Small: '스몰',
  Regular: '레귤러',
  Large: '라지',
};

const addOnLabels: Record<string, string> = {
  'Gift wrapping': '선물 포장',
  'Message card': '메시지 카드',
};

const initialForm: FormState = {
  buyerName: '',
  customsId: '',
  buyerMobile: '',
  buyerEmail: '',
  recipientName: '',
  recipientMobile: '',
  altPhone: '',
  postalCode: '',
  address1: '',
  address2: '',
  deliveryNote: '',
};

const formatPrice = (price: number) => `${price.toLocaleString('ko-KR')}원`;

function Field({
  label,
  required,
  placeholder,
  wide,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  wide?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span>
        {label}
        {required && <em>*</em>}
      </span>
      <input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function BenefitRail() {
  return (
    <aside className="benefit-rail" aria-label="회원 혜택">
      <div className="benefit-card member">
        <strong>MEMBER</strong>
        <span>회원 구매 시</span>
        <b>1,000</b>
        <span>포인트 적립</span>
      </div>
      <div className="benefit-card welcome">
        <strong>FIRST</strong>
        <span>첫 구매 고객</span>
        <b>3,000</b>
        <span>쿠폰 제공</span>
      </div>
    </aside>
  );
}

function App() {
  const [product, setProduct] = useState<Product>(defaultProduct);
  const [form, setForm] = useState<FormState>(initialForm);
  const [agreements, setAgreements] = useState<Agreements>({
    guestPrivacy: false,
    privacyPolicy: false,
    termsOfService: false,
  });
  const [size, setSize] = useState('Regular');
  const [quantity, setQuantity] = useState(1);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>('카드 결제');
  const [apiStatus, setApiStatus] = useState('상품 정보를 불러오는 중입니다.');
  const [customsMessage, setCustomsMessage] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('상품 정보를 불러오지 못했습니다.');
        }
        return response.json();
      })
      .then((data: Product) => {
        setProduct({ ...data, ...koreanProductCopy(data) });
        setApiStatus('백엔드 상품 정보와 연결되었습니다.');
      })
      .catch(() => {
        setApiStatus('백엔드 연결 전이라 기본 상품 정보로 표시 중입니다.');
      });
  }, []);

  const totals = useMemo<Totals>(() => {
    const items = product.price * quantity;
    const delivery = items >= product.free_delivery_minimum ? 0 : product.delivery_fee;
    const discount = quantity >= 2 ? 2000 : 0;

    return {
      items,
      delivery,
      discount,
      total: items + delivery - discount,
    };
  }, [product, quantity]);

  const updateForm = (key: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const verifyCustomsId = async () => {
    setCustomsMessage('확인 중입니다.');
    try {
      const response = await fetch('/api/customs/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.buyerName,
          mobile: form.buyerMobile,
          address: `${form.address1} ${form.address2}`.trim() || '주소 미입력',
          customs_id: form.customsId,
        }),
      });
      const result = await response.json();

      setCustomsMessage(result.message === 'Customs ID format is valid.' ? '개인통관고유부호 형식이 확인되었습니다.' : result.message);
    } catch {
      setCustomsMessage('통관부호 확인에 실패했습니다. 백엔드 서버 실행 상태를 확인해 주세요.');
    }
  };

  const copyBuyerToRecipient = (checked: boolean) => {
    if (!checked) {
      return;
    }
    setForm((current) => ({
      ...current,
      recipientName: current.buyerName,
      recipientMobile: current.buyerMobile,
    }));
  };

  const toggleAddOn = (option: string) => {
    setAddOns((current) => (current.includes(option) ? current.filter((item) => item !== option) : [...current, option]));
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setOrderMessage('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer: {
            name: form.buyerName,
            customs_id: form.customsId,
            mobile: form.buyerMobile,
            email: form.buyerEmail,
          },
          recipient: {
            name: form.recipientName,
            mobile: form.recipientMobile,
            alt_phone: form.altPhone || null,
            postal_code: form.postalCode,
            address1: form.address1,
            address2: form.address2,
            delivery_note: form.deliveryNote,
          },
          items: [
            {
              product_id: product.id,
              quantity,
              size,
              add_ons: addOns,
            },
          ],
          payment_method: paymentApiMap[paymentMethod],
          agreements: {
            guest_privacy: agreements.guestPrivacy,
            privacy_policy: agreements.privacyPolicy,
            terms_of_service: agreements.termsOfService,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('주문 정보를 확인해 주세요.');
      }

      const order = await response.json();
      setOrderMessage(`주문이 접수되었습니다. 주문번호: ${order.id}`);
    } catch (error) {
      setOrderMessage(error instanceof Error ? error.message : '주문 접수에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <p>SEJIN STORE</p>
        <h1>주문서 작성</h1>
        <span className="cart-count">{quantity}</span>
      </header>

      <main className="checkout-layout">
        <form className="checkout-main" onSubmit={submitOrder}>
          <section className="product-summary" aria-labelledby="product-title">
            <div className="product-left">
              <div className="product-image">
                <img src={heroImage} alt="베리 크림 디저트 박스 상품 이미지" />
              </div>
              <button className="cart-button" type="button">
                장바구니 담기
              </button>
            </div>

            <div className="product-info">
              <p className="product-subtitle">{product.subtitle}</p>
              <h2 id="product-title">{product.name}</h2>
              <p className="api-status">{apiStatus}</p>
              <div className="price-line">
                <span className="discount">{product.discount_rate}%</span>
                <strong>{formatPrice(product.price)}</strong>
                <del>{formatPrice(product.original_price)}</del>
              </div>

              <dl className="product-meta">
                <div>
                  <dt>원산지</dt>
                  <dd>{product.origin}</dd>
                </div>
                <div>
                  <dt>제조사</dt>
                  <dd>{product.maker}</dd>
                </div>
                <div>
                  <dt>제품군</dt>
                  <dd>{product.series}</dd>
                </div>
                <div>
                  <dt>묶음 할인</dt>
                  <dd>
                    <label className="radio-line">
                      <input type="radio" checked readOnly />
                      2개 이상 구매 시 2,000원 할인
                    </label>
                    <small>수량을 2개 이상 선택하면 자동 적용됩니다.</small>
                  </dd>
                </div>
              </dl>

              <dl className="delivery-meta">
                <div>
                  <dt>배송비</dt>
                  <dd>
                    <strong>{formatPrice(product.delivery_fee)}</strong>
                    <small>{formatPrice(product.free_delivery_minimum)} 이상 구매 시 무료 배송</small>
                    <small>도서산간 지역은 주소 확인 후 추가 배송비가 발생할 수 있습니다.</small>
                  </dd>
                </div>
              </dl>

              <div className="option-block">
                <p>
                  필수 옵션 <em>*</em>
                </p>
                <select value={size} onChange={(event) => setSize(event.target.value)}>
                  {product.options.sizes.map((option) => (
                    <option key={option} value={option}>
                      {sizeLabels[option] ?? option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="option-block">
                <p>수량</p>
                <div className="quantity-control">
                  <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>
                    -
                  </button>
                  <strong>{quantity}</strong>
                  <button type="button" onClick={() => setQuantity((current) => Math.min(20, current + 1))}>
                    +
                  </button>
                </div>
              </div>

              <div className="option-block">
                <p>추가 선택</p>
                <div className="chip-row">
                  {product.options.add_ons.map((option) => (
                    <button
                      className={addOns.includes(option) ? 'selected-chip' : ''}
                      key={option}
                      type="button"
                      onClick={() => toggleAddOn(option)}
                    >
                      {addOnLabels[option] ?? option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mini-total">
                <div>
                  <strong>예상 결제금액</strong>
                  <b>{formatPrice(totals.total)}</b>
                </div>
                <dl>
                  <div>
                    <dt>상품금액</dt>
                    <dd>{formatPrice(totals.items)}</dd>
                  </div>
                  <div>
                    <dt>배송비</dt>
                    <dd>{formatPrice(totals.delivery)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section className="form-section" aria-labelledby="buyer-title">
            <div className="section-title">
              <h2 id="buyer-title">주문자 정보</h2>
              <a href="#join">회원가입</a>
            </div>
            <div className="form-table">
              <Field label="이름" required placeholder="홍길동" value={form.buyerName} onChange={updateForm('buyerName')} />
              <label className="field">
                <span>
                  개인통관고유부호 <em>*</em>
                </span>
                <div>
                  <input
                    type="text"
                    placeholder="P로 시작하는 13자리"
                    value={form.customsId}
                    onChange={(event) => updateForm('customsId')(event.target.value.toUpperCase())}
                  />
                  <p className="error-text">이름, 휴대폰 번호, 주소가 통관부호 정보와 일치해야 합니다.</p>
                  <button className="small-button" type="button" onClick={verifyCustomsId}>
                    통관부호 확인
                  </button>
                  {customsMessage && <p className="helper-text">{customsMessage}</p>}
                </div>
              </label>
              <Field label="휴대폰" required placeholder="010-0000-0000" value={form.buyerMobile} onChange={updateForm('buyerMobile')} />
              <Field label="이메일" required placeholder="name@example.com" value={form.buyerEmail} onChange={updateForm('buyerEmail')} type="email" />
            </div>
          </section>

          <section className="form-section" aria-labelledby="receiver-title">
            <div className="section-title">
              <h2 id="receiver-title">배송지 정보</h2>
              <label className="same-check">
                <input type="checkbox" onChange={(event) => copyBuyerToRecipient(event.target.checked)} />
                주문자와 동일
              </label>
            </div>
            <div className="form-table">
              <Field label="받는 분" required placeholder="홍길동" value={form.recipientName} onChange={updateForm('recipientName')} />
              <Field label="휴대폰" required placeholder="010-0000-0000" value={form.recipientMobile} onChange={updateForm('recipientMobile')} />
              <Field label="추가 연락처" placeholder="선택 입력" value={form.altPhone} onChange={updateForm('altPhone')} />
              <label className="field field-wide">
                <span>
                  주소 <em>*</em>
                </span>
                <div className="address-fields">
                  <div className="zip-row">
                    <input type="text" placeholder="우편번호" value={form.postalCode} onChange={(event) => updateForm('postalCode')(event.target.value)} />
                    <button type="button">주소 검색</button>
                  </div>
                  <input type="text" placeholder="기본 주소" value={form.address1} onChange={(event) => updateForm('address1')(event.target.value)} />
                  <input type="text" placeholder="상세 주소" value={form.address2} onChange={(event) => updateForm('address2')(event.target.value)} />
                </div>
              </label>
              <Field label="배송 요청사항" placeholder="문 앞에 놓아 주세요" value={form.deliveryNote} onChange={updateForm('deliveryNote')} wide />
            </div>
          </section>

          <section className="payment-section" aria-labelledby="payment-title">
            <h2 id="payment-title">결제 금액</h2>
            <dl className="payment-total">
              <div>
                <dt>상품금액</dt>
                <dd>{formatPrice(totals.items)}</dd>
              </div>
              <div>
                <dt>배송비</dt>
                <dd>+ {formatPrice(totals.delivery)}</dd>
              </div>
              <div>
                <dt>묶음 할인</dt>
                <dd>- {formatPrice(totals.discount)}</dd>
              </div>
              <div className="grand-total">
                <dt>최종 결제금액</dt>
                <dd>{formatPrice(totals.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="payment-methods" aria-labelledby="method-title">
            <h2 id="method-title">결제 수단</h2>
            <div className="method-grid">
              {paymentMethods.map((method) => (
                <button className={method === paymentMethod ? 'selected' : ''} type="button" key={method} onClick={() => setPaymentMethod(method)}>
                  {method}
                </button>
              ))}
            </div>
            <p className="payment-note">
              - 카드사 혜택과 무이자 할부 조건은 결제 단계에서 확인할 수 있습니다.
              <br />- 간편 결제 정보는 선택한 결제대행사를 통해 안전하게 처리됩니다.
            </p>
          </section>

          <section className="agreement-section" aria-labelledby="agreement-title">
            <h2 id="agreement-title">필수 약관 동의</h2>
            <div className="agreement-list">
              <label>
                <span>
                  비회원 주문 개인정보 수집 동의 <em>*</em>
                </span>
                <input type="checkbox" checked={agreements.guestPrivacy} onChange={(event) => setAgreements((current) => ({ ...current, guestPrivacy: event.target.checked }))} />
              </label>
              <label>
                <span>
                  개인정보 처리방침 동의 <em>*</em>
                </span>
                <input type="checkbox" checked={agreements.privacyPolicy} onChange={(event) => setAgreements((current) => ({ ...current, privacyPolicy: event.target.checked }))} />
              </label>
              <label>
                <span>
                  이용약관 동의 <em>*</em>
                </span>
                <input type="checkbox" checked={agreements.termsOfService} onChange={(event) => setAgreements((current) => ({ ...current, termsOfService: event.target.checked }))} />
              </label>
            </div>
          </section>

          {orderMessage && <p className="order-message">{orderMessage}</p>}
          <button className="pay-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '주문 접수 중...' : `${formatPrice(totals.total)} 결제하기`}
          </button>
        </form>

        <BenefitRail />
      </main>

      <button className="talk-button" aria-label="고객센터 채팅 열기" type="button">
        상담
      </button>

      <footer className="checkout-footer">
        <span />
        상품, 배송, 교환 및 환불에 대한 책임은 판매자에게 있습니다.
      </footer>
    </div>
  );
}

function koreanProductCopy(product: Product): Partial<Product> {
  if (product.id !== productId) {
    return {};
  }

  return {
    name: '베리 크림 디저트 박스',
    subtitle: '오늘 만든 프레시 디저트 컬렉션',
    origin: '대한민국',
    maker: '세진 베이커리 랩',
    series: '데일리 트릿',
  };
}

export default App;
