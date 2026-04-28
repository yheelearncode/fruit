import './App.css';
import { useState } from 'react';

function App() {
  const price = 33440;
  const [count, setCount] = useState(1);
  const totalPrice = price * count;
  return (
    <div className="page">
      <header className="header">
        <h1>주문서</h1>
      </header>

      <main className="content">
        <section className="product-card">
          <div className="image-box">
            상품 이미지
          </div>

          <div className="product-info">
            <p className="badge">구매</p>
            <h2>헤더입니다</h2>
            <p className="description">
              디스크립션입니다
             
            </p>

            <p className="price">
              {price}원
            </p>

            <div className="quantity-control">
              <button onClick={() => setCount(count - 1)} disabled={count === 1}>-</button>
              <span>{count}</span>
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
              <p className="total-price">
              합계: {totalPrice}원
            </p>

          </div>
        </section>
      </main>
    </div>
  );
}

export default App;