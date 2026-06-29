import time, random


def matrix_rain(width=80, delay=0.05):
    print('\033[92m')
    while True:
        print(''.join(random.choice(['0', '1', ' ', ' ']) for _ in range(width)))
        time.sleep(delay)


if __name__ == "__main__":
    matrix_rain()
