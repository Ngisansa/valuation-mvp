"""
Simple ML regression stub using scikit-learn to predict price per sqm from comps CSV.
This is a minimal starter for future ML enhancements.

Usage:
pip install scikit-learn pandas
python ml_stub.py seeds/comps_sample.csv
"""
import sys
import pandas as pd
from sklearn.linear_model import LinearRegression

def main(csv_path):
    df = pd.read_csv(csv_path)
    df = df.dropna(subset=['area_sqm','price'])
    df['pps'] = df['price'] / df['area_sqm']
    X = df[['area_sqm']]
    y = df['pps']
    model = LinearRegression().fit(X, y)
    print('Coef:', model.coef_, 'Intercept:', model.intercept_)
    # Save model for later use...
    print('Sample prediction for area 150:', model.predict([[150]]))

if __name__ == '__main__':
    main(sys.argv[1])