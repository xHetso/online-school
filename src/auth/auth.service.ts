import { BadRequestException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ModelType } from '@typegoose/typegoose/lib/types'
import { compare, genSalt, hash } from 'bcryptjs'
import { InjectModel } from 'nestjs-typegoose'
import { UserModel } from 'src/user/user.model'
import { AuthLoginDto } from './dto/auth-login.dto'
import { AuthRegisterDto } from './dto/auth-register.dto'

@Injectable()
export class AuthService {
	constructor(
		@InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>,
		private readonly jwtService: JwtService,
	) {}

	async login(dto: AuthLoginDto) {
		const user = await this.validatorUser(dto)
		const tokens = await this.issue(String(user._id))

		return {
			user: this.returnUserFields(user),
			...tokens,
		}
	}

	async register(dto: AuthRegisterDto) {
		const oldUser = await this.UserModel.findOne({ email: dto.email })
		if (oldUser) {
			throw new BadRequestException(
				'User with this email is already registered',
			)
		}

		const salt = await genSalt(10)

		const newUser = new this.UserModel({
			email: dto.email,
			name: dto.name,
			surname: dto.surname,
			password: await hash(dto.password, salt),
		})

		const tokens = await this.issue(String(newUser._id))

		return {
			user: this.returnUserFields(newUser),
			...tokens,
		}
	}

	async validatorUser(dto: AuthLoginDto): Promise<UserModel> {
		const user = await this.UserModel.findOne({ email: dto.email })

		const IsValidPassword = await compare(dto.password, user.password)
		if (!IsValidPassword) {
			throw new BadRequestException('Invalid password')
		}
		return user
	}

	async issue(userId: string) {
		const data = { _id: userId }

		const refreshToken = await this.jwtService.signAsync(data, {
			expiresIn: '15d',
		})

		const accessToken = await this.jwtService.signAsync(data, {
			expiresIn: '1h',
		})

		return {
			accessToken,
			refreshToken,
		}
	}

	returnUserFields(user: UserModel) {
		return {
			_id: user._id,
			email: user.email,
			isAdmin: user.isAdmin,
		}
	}
}
