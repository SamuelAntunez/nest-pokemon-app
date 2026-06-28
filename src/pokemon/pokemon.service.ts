import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { isValidObjectId, Model } from 'mongoose';
import { Pokemon } from './entities/pokemon.entity';
import { InjectModel } from '@nestjs/mongoose';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PokemonService {

  private defaultLimit: number;

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,

    private readonly configService: ConfigService
  ) {
    this.defaultLimit = configService.get<number>('defaultLimit')! 
  }

  handleDBExceptions(error) {
    switch (true) {
      case error.code === 11000:
        throw new BadRequestException(`Pokemon already exist ${JSON.stringify(error.keyValue)}`)
      default:
        console.log(error)
        throw new InternalServerErrorException(`Error not handle`)
    }
  }

  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLocaleLowerCase()

    try {
      const pokemon = await this.pokemonModel.create(createPokemonDto)
      return pokemon;
    } catch (error: any) {
      this.handleDBExceptions(error)
    }
  }

  findAll({limit = this.defaultLimit, offset = 0}: PaginationDto) {
    return this.pokemonModel.find()
      .limit(limit)
      .skip(offset)
      .sort({
        no: 1
      })
      .select(['-__v'])
      
  }

  async findOne(term: string) {
    let pokemon: Pokemon | null = null
    // Nro Pokemon
    if (!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({
        no: +term
      })
    }
    // Mongo ID
    if (!pokemon && isValidObjectId(term)) {
      pokemon = await this.pokemonModel.findById(term)
    }
    // Name
    if (!pokemon) {
      pokemon = await this.pokemonModel.findOne({ name: term.toLowerCase().trim() })
    }
    if (!pokemon) {
      throw new NotFoundException(`Pokemon with term: ${term} not found`)
    }
    return pokemon
  }

  async update(term: string, updatePokemonDto: UpdatePokemonDto) {


    try {
      const pokemon = await this.findOne(term)
      if (updatePokemonDto?.name) updatePokemonDto.name = updatePokemonDto.name.toLowerCase()
      await pokemon.updateOne(updatePokemonDto, { new: true });
      return { ...pokemon.toJSON(), ...updatePokemonDto };
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {


    // await this.pokemonModel.findByIdAndDelete(id)

    const {deletedCount, acknowledged} = await this.pokemonModel.deleteOne({ _id: id });

    if (deletedCount === 0) throw new BadRequestException(`Pokemon with id ${ id } not found`)

    return `Deleted`;
  }
}
