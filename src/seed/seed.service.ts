import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PokeResponse } from './interfaces/poke-response.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Pokemon } from '../pokemon/entities/pokemon.entity';
import { Model } from 'mongoose';
import { AxiosAdapter } from '../common/adapters/axios.adapter';


@Injectable()
export class SeedService {

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,

    private readonly http: AxiosAdapter
  ) {

  }
  private readonly axios: AxiosInstance = axios


  async executeSeed() {

    try {
      const data = await this.http.get<PokeResponse>('https://pokeapi.co/api/v2/pokemon?limit=300')
      await this.pokemonModel.deleteMany()
      console.log(`seed deleted`)


      const pokemonToInsert: {name: string, no: number}[] = []

      // data.results.forEach(async ({ name, url }) => {
      //   const segments = url.split('/')
      //   const no: number = +segments[segments.length - 2]

      //   await this.pokemonModel.create({
      //     name: name.toLowerCase(),
      //     no: no
      //   })

      // })

      data.results.forEach(async ({ name, url }) => {
        const segments = url.split('/')
        const no: number = +segments[segments.length - 2]

        pokemonToInsert.push({name, no})

      })

      await this.pokemonModel.insertMany(pokemonToInsert)

      console.log(`Seed executed`)

    } catch (error) {
      console.warn(error)
    }




    return `Seed executed`;
  }
}
