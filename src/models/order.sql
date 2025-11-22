
CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) DEFAULT 'market',
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    base_token VARCHAR(50) NOT NULL,
    quote_token VARCHAR(50) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    slippage_pct DECIMAL(5, 2) DEFAULT 0.5,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    client_id VARCHAR(255),
    fills JSONB DEFAULT '[]'
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_client_id ON orders(client_id);