import hashlib

password = input("Enter password: ")
hashed_password = hashlib.sha512(password.encode()).hexdigest()

print(f'Hashed Password: {hashed_password}')