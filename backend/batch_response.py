class BatchResponse(BaseModel):
    id: UUID4
    product_id: UUID4
    batch_number: str
    expiry: Optional[str] = None
    mrp: float
    rate: float
    rate_a: float = 0
    rate_b: float = 0
    rate_c: float = 0
    cost: float
    current_stock: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
