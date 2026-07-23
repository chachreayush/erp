import enum
class UserRole(str, enum.Enum):
    AM_ADMIN = "am_admin"
    CM_ADMIN = "cm_admin"

role = UserRole.AM_ADMIN
print("role == 'am_admin':", role == 'am_admin')
print("role.value == 'am_admin':", role.value == 'am_admin')
print("role in ['am_admin']:", role in ['am_admin'])
print("role.value in ['am_admin']:", role.value in ['am_admin'])
print("role != 'am_admin':", role != 'am_admin')
