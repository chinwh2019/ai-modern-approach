import numpy as np
import pandas as pd

# Set seed for reproducibility
np.random.seed(42)

# --- Dataset 1: Simple Linear (Temperature -> Revenue) ---
n_samples = 100
temperature = np.random.uniform(low=10, high=35, size=n_samples)  # 10C to 35C
# True relationship: Revenue = 20 * Temp + 50 + Noise
revenue = 20 * temperature + 50 + np.random.normal(loc=0, scale=40, size=n_samples)
# Add some outliers to make it interesting
revenue[::20] += 150
revenue[1::20] -= 150

df_simple = pd.DataFrame(
    {"Temperature_C": np.round(temperature, 1), "Revenue_USD": np.round(revenue, 2)}
)
df_simple.to_csv("ice_cream_simple.csv", index=False)

# --- Dataset 2: Complex/Polynomial (Temperature -> Revenue with dropoff) ---
# True relationship: Low temp = low sales, High temp = high sales, TOO high = dropoff
temp_poly = np.random.uniform(low=5, high=40, size=n_samples)
revenue_poly = -0.5 * (temp_poly - 25) ** 2 + 600 + np.random.normal(0, 30, n_samples)
# Filter negative revenues just in case
revenue_poly = np.maximum(revenue_poly, 0)

df_poly = pd.DataFrame(
    {"Temperature_C": np.round(temp_poly, 1), "Revenue_USD": np.round(revenue_poly, 2)}
)
df_poly.to_csv("ice_cream_poly.csv", index=False)


# --- Dataset 3: Multivariate (Temp, Price, Flyers -> Revenue) ---
temperature_m = np.random.uniform(15, 35, n_samples)
price_m = np.random.uniform(2, 8, n_samples)  # $2 to $8 per cone
flyers_m = np.random.randint(0, 200, n_samples)

# True relationship:
# + Temp increases sales
# - Price decreases sales
# + Flyers increase sales
revenue_m = (
    (15 * temperature_m)
    - (40 * price_m)
    + (0.5 * flyers_m)
    + 200
    + np.random.normal(0, 20, n_samples)
)
revenue_m = np.maximum(revenue_m, 0)

df_multi = pd.DataFrame(
    {
        "Temperature_C": np.round(temperature_m, 1),
        "Price_USD": np.round(price_m, 2),
        "Flyers_Distributed": flyers_m,
        "Revenue_USD": np.round(revenue_m, 2),
    }
)
df_multi.to_csv("ice_cream_multivariate.csv", index=False)
