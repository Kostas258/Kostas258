import time, math


def sine_wave_loader(frames=100, amplitude=10, center=10, speed=3, delay=0.05):
    for i in range(frames):
        offset = int(center + amplitude * math.sin(i / speed))
        print(" " * offset + "●", end="\r")
        time.sleep(delay)
    print()


if __name__ == "__main__":
    sine_wave_loader()
