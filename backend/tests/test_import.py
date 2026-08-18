def test_foodbridge_backend_imports():
    from backend.app.main import app

    assert app.title == "FoodBridge API"