import './App.css';

function App() {
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

            <p className="price">33,440원</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;